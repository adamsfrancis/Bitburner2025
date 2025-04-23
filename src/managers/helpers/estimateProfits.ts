import { NS } from "@ns";
import { serverObject } from "/classes/classServer";
import { serverConstants } from "/libraries/constants";

const BATCH_SPACING = 200; // ms between batch phases
const CYCLE_DURATION_BUFFER = 500; // safety margin in ms

export interface ServerProfitEstimate {
    host: string;
    prepTime: number;
    timePerBatch: number;
    moneyPerBatch: number;
    batchesPerMinute: number;
    totalMoneyIn60Min: number;
    isPrepped: boolean;
    maxParallelBatches: number;
    ramPerBatch: number;
}

export function estimateProfitOver60Min(ns: NS, server: serverObject, availableRAM: number): ServerProfitEstimate {
    const host = server.hostName;
    const maxMoney = server.moneyMax;
    const currentMoney = Math.max(1, server.moneyAvailable);  // Avoid 0 or negative money
    const minSec = server.minDifficulty;
    const curSec = server.hackDifficulty;

    const hTime = ns.getHackTime(host);
    const gTime = ns.getGrowTime(host);
    const wTime = ns.getWeakenTime(host);

    const weakenEffect = ns.weakenAnalyze(1);
    const secToReduce = curSec - minSec;
    const isPrepped = secToReduce <= 0.1 && currentMoney >= maxMoney * 0.95;

    // Prep time estimate
    const weakenThreads1 = Math.ceil(secToReduce / weakenEffect);
    const growRatio = maxMoney / currentMoney;
    const validGrowRatio = (growRatio >= 1) ? growRatio : 1;  // Avoid invalid growth ratio

    const growThreads = Math.ceil(ns.growthAnalyze(host, validGrowRatio)); // Use valid grow ratio
    const growSecImpact = growThreads * 0.004;
    const weakenThreads2 = Math.ceil(growSecImpact / weakenEffect);

    const prepTime = Math.max(wTime, gTime + BATCH_SPACING, wTime + BATCH_SPACING * 2);

    // HWGW Batch estimate (stealing 10%)
    const hackThreads = Math.floor(0.1 / ns.hackAnalyze(host));
    const moneyPerBatch = maxMoney * serverConstants.hackAmountToSteal;
    const weakenThreads = 2 * Math.ceil((hackThreads * 0.002) / weakenEffect);
    const growThreadsPerBatch = Math.ceil(ns.growthAnalyze(host, 1 / (1 - 0.1))); // Ensure valid growth multiplier

    const ramH = ns.getScriptRam("/managers/scripts/hack.js");
    const ramG = ns.getScriptRam("/managers/scripts/grow.js");
    const ramW = ns.getScriptRam("/managers/scripts/weaken.js");

    const ramPerBatch = hackThreads * ramH +
                        growThreadsPerBatch * ramG +
                        weakenThreads * ramW;

    const maxParallelBatches = Math.floor(availableRAM / ramPerBatch);

    const timePerBatch = Math.max(hTime, gTime, wTime) + CYCLE_DURATION_BUFFER;
    const batchesPerMinute = (60_000 / BATCH_SPACING) * maxParallelBatches;

    const activeMinutes = isPrepped ? 60 : 60 - prepTime / 60_000;
    const totalMoney = moneyPerBatch * batchesPerMinute * activeMinutes;

    return {
        host,
        prepTime,
        timePerBatch,
        moneyPerBatch,
        batchesPerMinute,
        totalMoneyIn60Min: totalMoney,
        isPrepped,
        maxParallelBatches,
        ramPerBatch
    };
}

