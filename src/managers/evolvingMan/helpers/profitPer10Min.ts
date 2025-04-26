import { NS } from "@ns";
import { serverObject } from "/classes/classServer";
import { serverConstants } from "/libraries/constants";

export interface ServerProfitEstimate {
    host: string;
    prepTime: number;
    timePerBatch: number;
    moneyPerBatch: number;
    batchesPer10Min: number;
    totalMoneyIn10Min: number;
    isPrepped: boolean;
    maxParallelBatches: number;
    ramPerBatch: number;
    realisticBatchesPer10Min: number;
    realisticMoneyIn10Min: number
}

const CYCLE_DURATION_BUFFER = 200
const BATCH_SPACING = 500

export function estimateProfitOver10Min(ns: NS, server: serverObject, availableRAM: number): ServerProfitEstimate {
    const host = server.hostName;
    const maxMoney = server.moneyMax;
    const currentMoney = Math.max(1, server.moneyAvailable);  // Avoid 0 or negative
    const minSec = server.minDifficulty;
    const curSec = server.hackDifficulty;

    const hTime = ns.getHackTime(host);
    const gTime = ns.getGrowTime(host);
    const wTime = ns.getWeakenTime(host);

    const weakenEffect = ns.weakenAnalyze(1);
    const secToReduce = curSec - minSec;
    const isPrepped = secToReduce <= 0.1 && currentMoney >= maxMoney * 0.95;

    // Estimate prep time (rough upper bound)
    const weakenThreads1 = Math.ceil(secToReduce / weakenEffect);
    const growRatio = maxMoney / currentMoney;
    const validGrowRatio = Math.max(1, growRatio);
    const growThreads = Math.ceil(ns.growthAnalyze(host, validGrowRatio));
    const growSecImpact = growThreads * 0.004;
    const weakenThreads2 = Math.ceil(growSecImpact / weakenEffect);
    const prepTime = isPrepped ? 0 : Math.max(wTime, gTime + BATCH_SPACING, wTime + BATCH_SPACING * 2);

    // HGW Batch (10% hack)
    const hackThreads = Math.floor(0.1 / ns.hackAnalyze(host));
    const growThreadsPerBatch = Math.ceil(ns.growthAnalyze(host, 1 / (1 - 0.1)));
    const weakenThreads = 2 * Math.ceil((hackThreads * 0.002) / weakenEffect);

    const ramH = serverConstants.ramCostHack;
    const ramG = serverConstants.ramCostGrow;
    const ramW = serverConstants.ramCostWeaken;

    const ramPerBatch = hackThreads * ramH +
        growThreadsPerBatch * ramG +
        weakenThreads * ramW;

    const maxParallelBatches = Math.floor(availableRAM / ramPerBatch);

    const timePerBatch = Math.max(hTime, gTime, wTime) + CYCLE_DURATION_BUFFER;

    // How many batch windows fit in 10 minutes, after prep
    const availableTime = Math.max(0, 600_000 - prepTime); // in ms
    const batchCycles = Math.floor(availableTime / timePerBatch);
    const totalBatches = batchCycles * maxParallelBatches;

    const moneyPerBatch = maxMoney * serverConstants.hackAmountToSteal;
    const totalMoney = moneyPerBatch * totalBatches;
    const realisticMaxParallelBatches = Math.floor(availableRAM / ramPerBatch);
    const realisticBatchCycles = Math.floor(availableTime / timePerBatch);
    const hackChance = ns.hackAnalyzeChance(host);
    const realisticTotalBatches = hackChance < 1 ? 0 : realisticBatchCycles * realisticMaxParallelBatches;
    const realisticTotalMoney = hackChance < 1 ? 0 : realisticTotalBatches * moneyPerBatch;

    return {
        host,
        prepTime,
        timePerBatch,
        moneyPerBatch,
        batchesPer10Min: totalBatches,
        totalMoneyIn10Min: totalMoney,
        isPrepped,
        realisticBatchesPer10Min: realisticTotalBatches,
        realisticMoneyIn10Min: realisticTotalMoney,
        maxParallelBatches,
        ramPerBatch
    };
}
