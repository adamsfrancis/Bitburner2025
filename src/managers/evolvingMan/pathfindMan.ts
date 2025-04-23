// pathfindMan.js
import { NS } from "@ns";
import { serverConstants } from "/libraries/constants";
import { serverObject } from "/classes/classServer";

const sapperJobs = "/managers/evolvingMan/shared/sapperJobs.txt"; // Job queue storage
const scoutReport = "/managers/evolvingMan/shared/scout-targets.txt" //Report from scoutMan
const scoutMan = "/managers/evolvingMan/scoutMan.js"
const maxAttacks = 100;

async function main(ns: NS) {
    while (true) {
        //Send a scout to get information.
        await updateScoutingReport(ns);

        //Read the scouting report.
        const scoutingReport = readScoutingReport(ns);

        //Do we need to deploy the sappers?
        const needsCracking = Array.from(scoutingReport.values())
            .filter(server => !server.hasAdminRights);

        if (needsCracking.length > 0) {
            ns.write(sapperJobs, JSON.stringify(needsCracking), "w");
            await ns.exec('/managers/evolvingMan/sapperMan.js', "home")
        }

        //Next, use our strategyMan to figure out a jobs priority for the warMan
        const attackableTargets = Array.from(scoutingReport.values())
            .filter(server => server.serverType === "targetServer")
        


        await ns.sleep(1000)
    }
}

async function updateScoutingReport(ns: NS) {
    await ns.exec(scoutMan, "home")
}

function readScoutingReport(ns: NS): Map<string, serverObject> {
    const serverMap = new Map<string, serverObject>();

    const scoutingData = ns.read(scoutReport);
    if (!scoutingData) {
        return serverMap;
    }

    let scoutingReport: any[];
    try {
        scoutingReport = JSON.parse(scoutingData);
    } catch (e) {
        return serverMap;
    }

    for (const server of scoutingReport) {
        const parent = server.parentServer ?? undefined;
        const currentServer = new serverObject(ns, server, parent);
        serverMap.set(currentServer.hostName, currentServer);
    }

    return serverMap;
}