import { NS } from "@ns";
import { serverObject } from "/classes/classServer";
import { estimateProfitOver10Min as profitEstimate, ServerProfitEstimate } from "./helpers/profitPer10Min";
import { estimateGlobalRAM } from "./helpers/globalRAMEstimate";
import { evolvingManFiles, serverConstants } from "/libraries/constants";

const scout = "/managers/evolvingMan/scoutMan.js"
const sapper = "/managers/evolvingMan/sapperMan.js"

export async function main(ns: NS) {
    //Read the scouting report.
    const scoutingReport = await readScoutingReport(ns);

    //Do we need to deploy the sappers?
    const needsCracking = [...scoutingReport.values()].filter(s => !s.hasAdminRights)
    ns.tprint(needsCracking[0][0])
    await ns.write(evolvingManFiles.sapperJobs,JSON.stringify(needsCracking),"w")

    if (needsCracking.length > 0) {
        await ns.exec(sapper,"home")
    }
    await updateScoutingReport(ns, scoutingReport);
    const globalRAMAvailable = estimateGlobalRAM(ns, scoutingReport)
    const serverProfitabilityData = new Map<string, ServerProfitEstimate>
    for (const [, serverData] of scoutingReport) {
        const profitData = await profitEstimate(ns, serverData, globalRAMAvailable);
        serverProfitabilityData.set(serverData.hostName, profitData)
    }

    const sortedProfit = [...serverProfitabilityData.entries()]
    .sort((a, b) => b[1].realisticMoneyIn10Min - a[1].realisticMoneyIn10Min)
    .slice(0, 3); // Top 3

for (const [host] of sortedProfit) {
    const scoutingReport = await readScoutingReport(ns);
    const availableServers = [...scoutingReport]
        .filter(([_, s]) => s.hasAdminRights && s.ramAvailable >= serverConstants.ramCostWeaken)
        .map(([_, s]) => s);

    const hackThreads = Math.floor(0.1 / ns.hackAnalyze(host));
    const growThreads = Math.ceil(ns.growthAnalyze(host, 1 / (1 - 0.1)));
    const weakenThreads = 2 * Math.ceil((hackThreads * 0.002) / ns.weakenAnalyze(1));

    const canRun = await simulateBatchRamFit(ns, host, hackThreads, growThreads, weakenThreads, availableServers);
    if (canRun) {
        await ns.write(evolvingManFiles.pathfindersReport,host,"w")
    }

    ns.tprint(`⚠️ Skipping ${host}, not enough RAM for even one batch.`);
}

ns.tprint("🚨 No viable targets found that fit current RAM.");
return null;
}

export async function readScoutingReport(ns: NS): Promise<Map<string, serverObject>> {
    const serverMap = new Map<string, serverObject>();

    await ns.exec(scout,"home")
    const scoutingData = JSON.parse(ns.read(evolvingManFiles.scoutingReport));


    for (const server of scoutingData) {
        const curServer = new serverObject(ns,server,server.parent)
        serverMap.set(server.hostName, curServer);
    }

    return serverMap;
}

export async function updateScoutingReport(ns: NS, scoutingReport: Map<string, serverObject>) {
    await ns.exec(scout,"home")
    const scoutingData = JSON.parse(ns.read(evolvingManFiles.scoutingReport));

    for (const newData of scoutingData) {
        const existing = scoutingReport.get(newData.hostName);
        const curServer = new serverObject(ns,newData,newData.parent)
        if (existing) {
            existing.set(curServer); // Assuming this updates the instance
        } else {
            // Optionally handle new servers not yet in the map
            scoutingReport.set(curServer.hostName, curServer);
        }
    }
}
async function simulateBatchRamFit(
    ns: NS,
    target: string,
    hackThreads: number,
    growThreads: number,
    weakenThreads: number,
    availableServers: serverObject[]
): Promise<boolean> {
    const phases = [
        { script: "/managers/scripts/hack.js", threads: hackThreads },
        { script: "/managers/scripts/grow.js", threads: growThreads },
        { script: "/managers/scripts/weaken.js", threads: weakenThreads }
    ];

    const simServers = availableServers.map(s => ({ ...s }));

    for (const { script, threads } of phases) {
        const ram = ns.getScriptRam(script);
        let remaining = threads;

        for (const server of simServers) {
            const max = Math.floor(server.ramAvailable / ram);
            const use = Math.min(max, remaining);
            server.ramAvailable -= use * ram;
            remaining -= use;
            if (remaining <= 0) break;
        }

        if (remaining > 0) return false;
    }

    return true;
}
