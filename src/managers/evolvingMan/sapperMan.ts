import { NS } from "@ns";
import { serverObject } from "/classes/classServer";
import { CrackingJob } from "/classes/classCrackingJob";


const sapperJobs = "/managers/evolvingMan/shared/sapperJobs.txt"; // Job queue storage

export async function main(ns: NS) {
    const sapperJobQueue = readPathfinderReport(ns);

    for (const server of sapperJobQueue.values()) {
        new CrackingJob(ns, server);
    }
}


function readPathfinderReport(ns: NS): Map<string, serverObject> {
    const serverMap = new Map<string, serverObject>();

    const scoutingData = ns.read(sapperJobs);
    if (!scoutingData) return serverMap;

    let pathfinderReport: any[];
    try {
        pathfinderReport = JSON.parse(scoutingData);
    } catch (e) {
        return serverMap;
    }

    for (const server of pathfinderReport) {
        const parent = server.parentServer ?? undefined;
        const currentServer = new serverObject(ns, server, parent);
        serverMap.set(currentServer.hostName, currentServer);
    }

    return serverMap;
}
