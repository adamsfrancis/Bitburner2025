import { NS, Server } from "@ns";
import { hackingScripts, scriptConstants } from "./constants";
// @ts-ignore
import { allServers } from "/server/allServers.js";
import { getAvailableThreads,getAvailableServerThreads } from "./helpers/getAvailableThreads";
import { calculateInitialWeakenThreads, calculateWeakenTime } from "./helpers/calculateInitialWeaken";
import { getUsableServerList } from "./helpers/getUsableServers";
import { homeServer } from "/globalConstants";

/*  This file will be obsolete after we permanantly unlock formulas.exe, for
    now we need to weaken all our possible target servers so that our profit
    calc will work out.
*/

export async function main(ns: NS) {
    ns.disableLog("ALL")
    while(true){
    
    if (!allServers.length) {
        ns.print("⚠️  Warning: allServers list is empty!");
        return;
    }
    const targetList = getTargetList(ns).sort((a,b) => calculateWeakenTime(ns,a) - calculateWeakenTime(ns,b));
    const usableServers = getUsableServerList(ns);
    let maxSleepTime = 100;

    if (targetList.length === 0) {
        ns.print("✅ All servers fully weakened! Exiting...");
        break; // 🎯 All targets are prepped, stop looping
    }

    for(const server of targetList){
        const weakenNeeded = calculateInitialWeakenThreads(ns,server);
        const availableThreads = getAvailableThreads(ns);
        if(weakenNeeded <= availableThreads){
            const sleepyTime = dispatchBatchAcrossServers(ns,server,weakenNeeded,usableServers);
            maxSleepTime = Math.max(20000,maxSleepTime,sleepyTime)
        }
    }
    await ns.sleep(maxSleepTime);
}
    ns.exec("/hacking/batching/planBatch.js",homeServer)


}

function getTargetList(ns: NS) {
    const targetList: string[] = []
    const hackingSkill = ns.getHackingLevel();
    for (const server of allServers) {
        if(ns.getServerRequiredHackingLevel(server) <= hackingSkill && ns.getServerMaxMoney(server) > 0 && calculateInitialWeakenThreads(ns,server) > 0 && ns.hasRootAccess(server)){
            targetList.push(server)
        }
    }
    return targetList;
}

function dispatchBatchAcrossServers(ns: NS, targetServer: string, weakenNeeded: number, usableServers: string[]): number {
    let weakensLeft = weakenNeeded;
    const weakenTime = ns.getWeakenTime(targetServer);

    for (const server of usableServers) {
        if (weakensLeft === 0) return weakenTime;

        const availableThreads = getAvailableServerThreads(ns, server);
        const threadsToSend = Math.min(weakensLeft, availableThreads);

        if (threadsToSend > 0) {
            const pid = ns.exec(hackingScripts.weaken, server, threadsToSend, targetServer, 0, false, threadsToSend);
            if (pid !== 0) {
                weakensLeft -= threadsToSend;
            } else {
                ns.print(`⚠️ Failed to launch weaken on ${server}`);
            }
        }
    }

    return weakenTime;
}


