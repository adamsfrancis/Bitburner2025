import { NS } from "@ns";
import { getTargetsRanked } from "./rankTargets";
import { hackingScripts, scriptConstants, batchSpacer } from "../constants";
import { homeServer } from "/globalConstants";
import { getUsableServerList } from "../helpers/getUsableServers";
import { getAvailableServerThreads, getAvailableThreads } from "../helpers/getAvailableThreads";


export async function main(ns: NS) {
    ns.disableLog("ALL");

    while(true){
    const args = ns.flags([["target", ""]]);
    let primeTarget: string;

    if (args.target && typeof args.target === "string") {
        primeTarget = args.target;
        ns.print(`🎯 Using provided target: ${primeTarget}`);
    } else {
        const targetList = getTargetsRanked(ns);
        primeTarget = targetList[0];
        ns.print(`🎯 Using top-ranked target: ${primeTarget}`);
    }

    const hackThreads = getHackThreads(ns, primeTarget);
    const growThreads = getGrowThreads(ns, primeTarget, getAmountPerHackBatch(ns, hackThreads, primeTarget));
    const [weakenThreads1, weakenThreads2] = getWeakenThreads(hackThreads, growThreads);

    if (!isServerPrepped(ns, primeTarget)) {
        const isPrepped = await prepServer(ns, primeTarget);
        if (!isPrepped) {
            ns.tprint("Failed to prep target server. Aborting batch execution.");
            return;
        }
    }

    const pid = ns.exec("/hacking/batching/batchRunner.js", homeServer, 1,
        weakenThreads1, weakenThreads2, growThreads, hackThreads, primeTarget
    );

    if (pid === 0) {
        ns.tprint("Failed to start batchRunner script.");
        return;
    }

    while (ns.isRunning(pid)) {
        await ns.sleep(100); // Wait until batchRunner completes
    }
    await ns.sleep(500)
}
}

function getHackThreads(ns: NS, server: string) {

    const moneyToSteal = ns.getServerMaxMoney(server) * scriptConstants.hackPercentToSteal;
    return Math.max(1, Math.floor(ns.hackAnalyzeThreads(server, moneyToSteal)));
}


function getGrowThreads(ns: NS, server: string, amountStolen: number) {
    const maxMoney = ns.getServerMaxMoney(server);
    const growRatio = maxMoney / (maxMoney - amountStolen);
    return Math.max(1, Math.ceil(ns.growthAnalyze(server, growRatio)));

}

function getAmountPerHackBatch(ns: NS, hackThreads: number, server: string) {
    const percentPerHack = ns.hackAnalyze(server);
    const percentPerBatch = hackThreads * percentPerHack;
    return percentPerBatch * ns.getServerMaxMoney(server);
}

function getWeakenThreads(hackThreads: number, growThreads: number) {
    const hackWeaken = Math.max(1, Math.ceil((hackThreads * scriptConstants.serverFortifyHack) / scriptConstants.serverWeakenAmount))
    const growWeaken = Math.max(1, Math.ceil((growThreads * scriptConstants.serverFortifyGrow) / scriptConstants.serverWeakenAmount))
    return [hackWeaken, growWeaken]
}

export function getDelays(ns: NS, targetEndTime: number, primeTarget: string, batchSpacer: number) {
    const playerInfo = ns.getPlayer()
    const serverInfo = ns.getServer(primeTarget)
    const hackTime = ns.formulas.hacking.hackTime(serverInfo,playerInfo);
    const growTime = ns.formulas.hacking.growTime(serverInfo,playerInfo);
    const weakenTime = ns.formulas.hacking.weakenTime(serverInfo,playerInfo);
    return {
        weakenDelay1: targetEndTime - weakenTime - (batchSpacer * 2),
        weakenDelay2: targetEndTime - weakenTime,
        growDelay: targetEndTime - growTime - batchSpacer,
        hackDelay: targetEndTime - hackTime - (batchSpacer * 3)
    }
}
async function prepServer(ns: NS, target: string) {
    ns.disableLog("ALL")
    let usableServers = getUsableServerList(ns);
    let targetServer = ns.getServer(target)
    const maxMoney = targetServer.moneyMax ?? 0
    const minSecurity = targetServer.minDifficulty ?? 1
    const playerInfo = ns.getPlayer()
    const moneyThreshold = maxMoney * 0.99;
    const securityThreshold = minSecurity + 0.01;

    const availThreads = getAvailableThreads(ns)
    let growNeeded = Math.ceil(ns.formulas.hacking.growThreads(targetServer,playerInfo,maxMoney))
    let weakenNeeded = Math.ceil((growNeeded * scriptConstants.serverFortifyGrow)/scriptConstants.serverWeakenAmount) + Math.ceil((targetServer.hackDifficulty!-targetServer.minDifficulty!)/scriptConstants.serverWeakenAmount)
    ns.print(`Need ${growNeeded} grows and ${weakenNeeded} weakens for prep.`)

    if(targetServer.hackDifficulty! > targetServer.minDifficulty!){
        const weakenNeededInitial = Math.ceil((targetServer.hackDifficulty! - targetServer.minDifficulty!)/scriptConstants.serverWeakenAmount)
        distribute(hackingScripts.weaken,weakenNeededInitial);
        await ns.sleep(ns.formulas.hacking.weakenTime(targetServer,playerInfo) + 100)
    }

    while((targetServer.moneyAvailable ?? 0) < moneyThreshold || (targetServer.hackDifficulty ?? 1) > securityThreshold){
        usableServers = getUsableServerList(ns);
        while((growNeeded + weakenNeeded) > availThreads){
            growNeeded = Math.ceil(growNeeded * 0.9);
            weakenNeeded = Math.ceil((growNeeded * scriptConstants.serverFortifyGrow)/scriptConstants.serverWeakenAmount)
        }
        ns.print(`Can fit ${growNeeded} grows and ${weakenNeeded} weakens for prep.`)
        distribute(hackingScripts.weaken,weakenNeeded);
        distribute(hackingScripts.grow,growNeeded)
        await ns.sleep(ns.formulas.hacking.weakenTime(targetServer,playerInfo) + 100)
        targetServer = ns.getServer(target)
    }

    function distribute(script: string, threads: number): number {
        let threadsLeft = threads;
        for (const server of usableServers) {
            const maxThreads = getAvailableServerThreads(ns,server)
            if (maxThreads <= 0) continue;

            const toRun = Math.min(threadsLeft, maxThreads);
            const pid = ns.exec(script, server, toRun, target, false, toRun);
            if (pid !== 0) threadsLeft -= toRun;
            if (threadsLeft <= 0) break;
        }
        return threads - threadsLeft;
    }

    return true;
}




function isServerPrepped(ns: NS, server: string) {
    const minSec = ns.getServerMinSecurityLevel(server);
    const curSec = ns.getServerSecurityLevel(server);
    const maxMoney = ns.getServerMaxMoney(server);
    const currentMoney = ns.getServerMoneyAvailable(server);
    if (curSec - minSec <= 0.01 && currentMoney >= maxMoney * 0.99) {
        return true;
    }
    return false;
}