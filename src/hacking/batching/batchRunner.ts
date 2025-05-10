import { NS } from "@ns";
import { getDelays } from "./planBatch";
import { hackingScripts,batchSpacer } from "../constants";
import { getAvailableThreads, getAvailableServerThreads } from "../helpers/getAvailableThreads";
import { getUsableServerList } from "../helpers/getUsableServers";
import { calculateWeakenTime } from "../helpers/calculateInitialWeaken";
import { homeServer } from "/globalConstants";


export async function main(ns: NS) {
    const [w1, w2, g, h, target] = ns.args;
    const weakenThreads1 = Number(w1);
    const weakenThreads2 = Number(w2);
    const growThreads = Number(g);
    const hackThreads = Number(h);
    const targetServer = String(target);
    const stock = false;

    const launchDelay = 200; // give us time to prep the first batch
    const totalThreadsPerBatch = weakenThreads1 + weakenThreads2 + growThreads + hackThreads;
    const maxThreads = getAvailableThreads(ns);
    const maxBatches = Math.min(10000,Math.floor((maxThreads / totalThreadsPerBatch) * 0.9));

    const batchStart = performance.now() + launchDelay + ns.formulas.hacking.weakenTime(ns.getServer(targetServer),ns.getPlayer());
    const usableServers = getUsableServerList(ns);

    let batchIndex = 0;

    for (let i = 0; i < maxBatches; i++) {
        const baseTime = batchStart + (i * batchSpacer * 4);
        const delays = getDelays(ns, baseTime, targetServer, batchSpacer);

        const batch = [
            { delay: delays.hackDelay, script: hackingScripts.hack, threads: hackThreads, label: `hack-${i}` },
            { delay: delays.weakenDelay1, script: hackingScripts.weaken, threads: weakenThreads1, label: `weaken1-${i}` },
            { delay: delays.growDelay, script: hackingScripts.grow, threads: growThreads, label: `grow-${i}` },
            { delay: delays.weakenDelay2, script: hackingScripts.weaken, threads: weakenThreads2, label: `weaken2-${i}` },
        ];

        for (const action of batch) {
            await dispatch(ns, usableServers, action.script, action.threads, targetServer, action.delay, stock);
        }

        batchIndex++;
    }

    const sleepyTime = launchDelay + (batchSpacer * 4 * batchIndex) + calculateWeakenTime(ns,targetServer)
    const sleepUntil = new Date(Date.now() + sleepyTime)

    ns.tprint(`Scheduled ${batchIndex} HWGW batches for ${targetServer}, sleeping until ${sleepUntil}`);
    await ns.sleep(sleepyTime)
}

async function dispatch(
    ns: NS,
    servers: string[],
    script: string,
    threads: number,
    target: string,
    absoluteTime: number,  // This is the intended *wall time* the action should complete
    stock: boolean
) {
    const delay = Math.max(0, absoluteTime - performance.now());
    let threadsLeft = threads;

    for (const server of servers) {
        const available = getAvailableServerThreads(ns, server);
        const toUse = Math.min(threadsLeft, available);

        if (toUse > 0) {
            const pid = ns.exec(script, server, toUse, target, delay, stock, toUse);
            if (pid !== 0) {
                threadsLeft -= toUse;
            }
        }

        if (threadsLeft <= 0) break;
    }

    if (threadsLeft > 0) {
        await ns.sleep(10);
        await dispatch(ns, servers, script, threadsLeft, target, absoluteTime, stock);
    }
}







// import { NS } from "@ns";
// import { getDelays } from "./planBatch";
// import { hackingScripts } from "../constants";
// import { getAvailableThreads, getAvailableServerThreads } from "../helpers/getAvailableThreads";
// import { scriptConstants } from "../constants";
// import { getUsableServerList } from "../helpers/getUsableServers";
// import { homeServer } from "/globalConstants";

// export async function main(
//     ns: NS
// ) {
//     const [w1, w2, g, h, target] = ns.args;

//     const weakenThreads1 = Number(w1);
//     const weakenThreads2 = Number(w2);
//     const growThreads = Number(g);
//     const hackThreads = Number(h);
//     const targetServer = String(target);
//     let batchStart = performance.now();
//     let batchCount = 0;
//     const launchDelay = 1000;
//     const batchSpacer = 200;
//     let targetTime = batchStart + launchDelay;

//     while (canFitFullBatch(ns, weakenThreads1, weakenThreads2, growThreads, hackThreads)) {
//         const delays = getDelays(ns, targetTime, targetServer, batchSpacer);

//         await waitUntil(performance.now(), targetTime - delays.weakenDelay1);
//         await dispatch(ns, hackingScripts.weaken, weakenThreads1, targetServer, "weaken1");

//         await waitUntil(performance.now(), targetTime - delays.weakenDelay2);
//         await dispatch(ns, hackingScripts.weaken, weakenThreads2, targetServer, "weaken2");

//         await waitUntil(performance.now(), targetTime - delays.growDelay);
//         await dispatch(ns, hackingScripts.grow, growThreads, targetServer, "grow");

//         await waitUntil(performance.now(), targetTime - delays.hackDelay);
//         await dispatch(ns, hackingScripts.hack, hackThreads, targetServer, "hack");

//         targetTime += batchSpacer * 4;
//         batchCount++;
//     }
//     ns.tprint(`Sent ${batchCount} batches to ${targetServer}, sleeping for ${(targetTime-performance.now())/1000} seconds.`)
//     await ns.sleep(targetTime-performance.now())
//     ns.exec('/hacking/batching/planBatch.js',homeServer)
// }

// async function dispatch(ns: NS, script: string, threads: number, target: string, label: string) {
//     const ramPerThread = scriptConstants.ramCostThread;

//     while (getAvailableThreads(ns) < threads) {
//         await ns.sleep(50);
//     }

//     const usableServers = getUsableServerList(ns);
//     let threadsLeft = threads;
//     while (threadsLeft > 0) {
//         for (const server of usableServers) {
//             const availableThreads = getAvailableServerThreads(ns, server);
//             const threadsToUse = Math.min(threadsLeft, availableThreads);

//             if (threadsToUse > 0) {
//                 const pid = ns.exec(script, server, threadsToUse, target, false, threadsToUse);
//                 if (pid !== 0) {
//                     threadsLeft -= threadsToUse;
//                 }
//             }

//             if (threadsLeft === 0) break;
//         }

//         if (threadsLeft > 0) {
//             await ns.sleep(100); // Wait before retrying to allocate remaining threads
//         }
//     }
// }

// async function waitUntil(currentTime: number, targetTime: number) {
//     while (currentTime < targetTime) {
//         await new Promise(res => setTimeout(res, 2));
//         currentTime = performance.now();
//     }
// }

// function canFitFullBatch(ns: NS, w1: number, w2: number, g: number, h: number): boolean {
//     const totalThreads = w1 + w2 + g + h;
//     const totalRamNeeded = totalThreads * scriptConstants.ramCostThread;
//     let totalFreeRam = 0;

//     for (const server of getUsableServerList(ns)) {
//         const max = ns.getServerMaxRam(server);
//         const used = ns.getServerUsedRam(server);
//         totalFreeRam += max - used;
//     }

//     return totalFreeRam >= totalRamNeeded;
// }

