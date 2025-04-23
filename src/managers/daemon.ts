import { NS } from "@ns";
import { readAndParseJSON } from "/libraries/helpers";
import { globalFiles, hackingTools, serverConstants } from "/libraries/constants";
import { serverObject } from "/classes/classServer";
import { hackingTool } from "/classes/classToolBag";
import { Person } from "@ns";
import { filesToSCP } from "/libraries/constants";
import { Batch } from "/libraries/types";
import { estimateProfitOver60Min, ServerProfitEstimate } from '/managers/helpers/estimateProfits'


const serverMap = new Map<string, serverObject>();
const toolBag = new Map<string, hackingTool>()

export async function main(ns: NS) {
    //Get the initial server map from storage and parse it.
    const rawMap = await readAndParseJSON<any[]>(ns, globalFiles["serverMap"]);

    //Format the items as serverObjects.
    const rehydrated = rehydrateServers(ns, rawMap);

    //Store serverObjects in serverMap
    serverMap.clear();
    for (const [host, server] of rehydrated) {
        serverMap.set(host, server);
    }

    while (true) {
        await maintenanceLoop(ns);
        await sendMaxBatches(ns, serverMap);
        await ns.sleep(1000);
    }

}

export async function prepTargetServer(ns: NS, target: serverObject, serverMap: Map<string, serverObject>) {
    const weakenScript = "/managers/scripts/weaken.js";
    const growScript = "/managers/scripts/grow.js";

    const ramW = ns.getScriptRam(weakenScript);
    const ramG = ns.getScriptRam(growScript);

    const delays = {
        grow: 200,
        weaken: 400,
    };

    const getUsableHosts = () =>
        [...serverMap.values()].filter(s => s.hasAdminRights && s.ramAvailable > 0).map(h => ({ ...h })) as serverObject[];

    // ---- PHASE 1: Weaken to minDifficulty ----
    if (target.hackDifficulty > target.minDifficulty) {
        const secDiff = target.hackDifficulty - target.minDifficulty;
        const weakenThreads = Math.ceil(secDiff / ns.weakenAnalyze(1));

        ns.tprint(`🧮 Weaken Phase 1: SecDiff=${secDiff}, Weaken per thread=${ns.weakenAnalyze(1)}, Threads needed=${weakenThreads}`);
        ns.tprint(`🛡️ Phase 1: Weakening ${target.hostName} (Sec: ${target.hackDifficulty} ➝ ${target.minDifficulty}) using ${weakenThreads} threads`);

        const wRemain = dispatchScriptAcrossHosts(ns, weakenScript, target.hostName, 0, weakenThreads, getUsableHosts());

        if (wRemain > 0) {
            ns.tprint(`⚠️ Phase 1 incomplete: ${wRemain} weaken threads could not be dispatched`);
        }

        const sleepTime = ns.getWeakenTime(target.hostName);
        ns.tprint(`⏳ Sleeping ${Math.round(sleepTime / 1000)}s for weaken to finish...`);
        await ns.sleep(sleepTime);

        await updateServerMap(ns, serverMap);
        const refreshed = serverMap.get(target.hostName);
        if (!refreshed) {
            ns.tprint(`❌ Target ${target.hostName} not found after Phase 1.`);
            return;
        }
        target = refreshed;
    }

    // ---- PHASE 2: Grow and re-weaken until fully prepped ----
    while (target.moneyAvailable < target.moneyMax * 0.99 || target.hackDifficulty > target.minDifficulty + 0.1) {
        const growRatio = target.moneyMax / Math.max(1, target.moneyAvailable);

        if (!isFinite(growRatio) || growRatio < 1.01) {
            ns.tprint(`⚠️ Skipping grow: growRatio too small (${growRatio.toFixed(2)})`);
            break;
        }

        const growThreads = Math.ceil(ns.growthAnalyze(target.hostName, growRatio));
        const secGrow = growThreads * serverConstants.serverFortifyAmount;
        const weakenThreads = Math.ceil(secGrow / ns.weakenAnalyze(1));

        ns.tprint(`🧮 Weaken Phase 2: GrowThreads=${growThreads}, Sec from grow=${secGrow}, Weaken per thread=${ns.weakenAnalyze(1)}, Threads needed=${weakenThreads}`);
        ns.tprint(`💰 Phase 2: Growing ${target.hostName} ($${ns.formatNumber(target.moneyAvailable)} ➝ $${ns.formatNumber(target.moneyMax)}) using ${growThreads} grow & ${weakenThreads} weaken threads`);

        const gRemain = dispatchScriptAcrossHosts(ns, growScript, target.hostName, delays.grow, growThreads, getUsableHosts());
        const wRemain = dispatchScriptAcrossHosts(ns, weakenScript, target.hostName, delays.weaken, weakenThreads, getUsableHosts());

        if (gRemain > 0 || wRemain > 0) {
            ns.tprint(`⚠️ Phase 2 incomplete: G=${gRemain}, W=${wRemain}`);
        }

        const sleepTime = ns.getWeakenTime(target.hostName) + delays.weaken;
        ns.tprint(`⏳ Sleeping ${Math.round(sleepTime / 1000)}s for grow + weaken...`);
        await ns.sleep(sleepTime);

        await updateServerMap(ns, serverMap);
        const updated = serverMap.get(target.hostName);
        if (!updated) {
            ns.tprint(`❌ Target ${target.hostName} not found in server map.`);
            return;
        }
        target = updated;
    }

    ns.tprint(`✅ Prep complete: ${target.hostName} is ready!`);
}



export function dispatchScriptAcrossHosts(
    ns: NS,
    script: string,
    target: string,
    delay: number,
    totalThreads: number,
    hosts: serverObject[]
): number {
    const ramCost = ns.getScriptRam(script);
    let threadsLeft = totalThreads;

    for (const host of hosts) {
        if (threadsLeft <= 0) break;

        const maxThreads = Math.floor(host.ramAvailable / ramCost);
        if (maxThreads <= 0) continue;

        const threads = Math.min(maxThreads, threadsLeft);
        const pid = ns.exec(script, host.hostName, threads, target, delay, false, threads);
        if (pid !== 0) {
            host.ramAvailable -= threads * ramCost;
            threadsLeft -= threads;
        }
    }

    return threadsLeft;
}

function selectBestTargetWithEstimate(ns: NS, serverMap: Map<string, serverObject>, availableRAM: number): { targetHost: string, estimate: ServerProfitEstimate } | null {
    const candidates = [...serverMap.values()].filter(s => s.hasAdminRights && s.moneyMax > 0);

    if (candidates.length === 0) return null;

    const estimates = candidates.map(s => ({
        server: s,
        estimate: estimateProfitOver60Min(ns, s, availableRAM)
    }));

    const best = estimates.reduce((a, b) =>
        a.estimate.totalMoneyIn60Min > b.estimate.totalMoneyIn60Min ? a : b
    );

    return { targetHost: best.server.hostName, estimate: best.estimate };
}

async function sendMaxBatches(ns: NS, serverMap: Map<string, serverObject>) {
    const availableRAM = getCurrentAvailableRAM(serverMap);

    const result = selectBestTargetWithEstimate(ns, serverMap, availableRAM);
    if (!result) {
        ns.tprint("❌ No valid target selected.");
        return;
    }

    const { targetHost, estimate } = result;
    const target = serverMap.get(targetHost);
    if (!target) {
        ns.tprint(`⚠️ Target ${targetHost} not found in server map.`);
        return;
    }

    // 🧼 PREP TARGET if needed
    if (!target.isPrepped()) {
        ns.tprint(`🛠️ Target ${targetHost} not prepped. Starting prep...`);
        await prepTargetServer(ns, target, serverMap);
        await updateServerMap(ns, serverMap); // Optional: ensure fresh data after prep
    }

    ns.tprint(`🎯 Target: ${targetHost} | Est. $/60min: ${ns.formatNumber(estimate.totalMoneyIn60Min)} | Prep time: ${ns.tFormat(estimate.prepTime)}`);

    const availableHosts = [...serverMap.values()]
        .filter(h => h.hasAdminRights && h.ramAvailable > 0)
        .map(h => Object.assign({}, h)); // Clone to allow RAM tracking

    const batches = generateBatchPool(ns, target, availableHosts);
    ns.tprint(`🚀 Attempting to dispatch ${batches.length} batches to ${targetHost}`);

    let dispatchedCount = 0;
    let maxBatchDuration = 0;

    for (const batch of batches) {
        const success = await dispatchBatch(ns, batch, availableHosts);
        if (!success) {
            ns.tprint("⚠️ Ran out of RAM or failed dispatching a batch. Stopping batch deployment.");
            break;
        }

        dispatchedCount++;

        const batchEndTime = getBatchEndTime(ns, batch);
        if (batchEndTime > maxBatchDuration) {
            maxBatchDuration = batchEndTime;
        }
    }

    ns.tprint(`✅ Dispatched ${dispatchedCount} batches. Waiting ${ns.tFormat(maxBatchDuration)} for completion.`);
    await ns.sleep(maxBatchDuration);

    await updateServerMap(ns, serverMap);
    ns.tprint(`📉 Security after batch: ${target.hackDifficulty}`);
}

function estimateRamForBatch(ns: NS, threads: BatchThreads) {
    const ramPerHack = ns.getScriptRam("/managers/scripts/hack.js");
    const ramPerGrow = ns.getScriptRam("/managers/scripts/grow.js");
    const ramPerWeaken = ns.getScriptRam("/managers/scripts/weaken.js");

    return (
        threads.hack * ramPerHack +
        threads.grow * ramPerGrow +
        (threads.weaken1 + threads.weaken2) * ramPerWeaken
    );
}

function getBatchEndTime(ns: NS, batch: Batch): number {
    const weakenTime = ns.getWeakenTime(batch.target);
    const growTime = ns.getGrowTime(batch.target);
    const hackTime = ns.getHackTime(batch.target);

    return Math.max(
        batch.delays.hack + hackTime,
        batch.delays.grow + growTime,
        batch.delays.weaken1 + weakenTime,
        batch.delays.weaken2 + weakenTime
    );
}

function generateBatchPool(ns: NS, target: serverObject, availableHosts: serverObject[]): Batch[] {
    const batches: Batch[] = [];

    const weakenTime = ns.getWeakenTime(target.hostName);
    const growTime = ns.getGrowTime(target.hostName);
    const hackTime = ns.getHackTime(target.hostName);

    const hackFraction = serverConstants.hackAmountToSteal; // e.g. 0.01 for 1%
    const desiredAmount = target.moneyMax * hackFraction;
    const hackAnalyze = ns.hackAnalyze(target.hostName);
    const rawHackThreads = desiredAmount / (hackAnalyze * target.moneyMax);
    const hackThreads = Math.max(1, Math.floor(rawHackThreads));
    const actualHackAmount = hackThreads * hackAnalyze * target.moneyMax;

    const growMultiplier = target.moneyMax / Math.max(1, target.moneyMax - actualHackAmount);
    const growThreads = Math.max(1, Math.ceil(ns.growthAnalyze(target.hostName, growMultiplier)));

    const securityAddedByHack = hackThreads * serverConstants.serverFortifyAmount;
    const securityAddedByGrow = growThreads * serverConstants.serverFortifyAmount * 2;

    const weakenThreads1 = Math.max(1, Math.ceil(securityAddedByHack / serverConstants.serverWeakenAmount));
    const weakenThreads2 = Math.max(1, Math.ceil(securityAddedByGrow / serverConstants.serverWeakenAmount));

    const baseThreads: BatchThreads = {
        hack: hackThreads,
        grow: growThreads,
        weaken1: weakenThreads1,
        weaken2: weakenThreads2,
    };

    const totalAvailableRam = availableHosts.reduce((sum, host) => sum + host.ramAvailable, 0);

    // 1. Estimate RAM for base threads
    const baseRam = estimateRamForBatch(ns, baseThreads);

    // 2. Check if base threads fit in total available RAM
    if (baseRam <= totalAvailableRam) {
        // Base threads can fit, no need to scale
        const maxBatches = Math.floor(totalAvailableRam / baseRam);

        ns.tprint(`📦 RAM per batch: ${ns.formatRam(baseRam)}`);
        ns.tprint(`📦 Total available RAM: ${ns.formatRam(totalAvailableRam)}`);
        ns.tprint(`📦 Max batches: ${maxBatches}`);

        // Create the batch pool with base threads
        const delaySpacing = 200;
        for (let i = 0; i < maxBatches; i++) {
            const offset = i * delaySpacing;

            batches.push({
                target: target.hostName,
                threads: { ...baseThreads },
                delays: {
                    hack: weakenTime - hackTime - 3 * delaySpacing + offset,
                    weaken1: offset,
                    grow: weakenTime - growTime - delaySpacing + offset,
                    weaken2: delaySpacing * 2 + offset,
                },
                totalRam: baseRam,
            });
        }
    } else {
        // If base threads do not fit, scale them down
        const scaledThreads = scaleBatchThreads(ns, target, baseThreads, totalAvailableRam);

        // Calculate the RAM usage per scaled batch
        const totalRamPerBatch = estimateRamForBatch(ns, scaledThreads);
        const maxBatches = Math.floor(totalAvailableRam / totalRamPerBatch);

        ns.tprint(`📦 RAM per batch: ${ns.formatRam(totalRamPerBatch)}`);
        ns.tprint(`📦 Total available RAM: ${ns.formatRam(totalAvailableRam)}`);
        ns.tprint(`📦 Max batches: ${maxBatches}`);

        // Create the batch pool with scaled threads
        const delaySpacing = 200;
        for (let i = 0; i < maxBatches; i++) {
            const offset = i * delaySpacing;

            batches.push({
                target: target.hostName,
                threads: { ...scaledThreads },
                delays: {
                    hack: weakenTime - hackTime - 3 * delaySpacing + offset,
                    weaken1: offset,
                    grow: weakenTime - growTime - delaySpacing + offset,
                    weaken2: delaySpacing * 2 + offset,
                },
                totalRam: totalRamPerBatch,
            });
        }
    }

    return batches;
}


async function dispatchBatch(ns: NS, batch: Batch, hosts: serverObject[]) {
    const ramPer = {
        hack: ns.getScriptRam("/managers/scripts/hack.js"),
        grow: ns.getScriptRam("/managers/scripts/grow.js"),
        weaken: ns.getScriptRam("/managers/scripts/weaken.js"),
    };

    const scripts = [
        { script: "/managers/scripts/weaken.js", threads: batch.threads.weaken1, delay: batch.delays.weaken1 },
        { script: "/managers/scripts/hack.js", threads: batch.threads.hack, delay: batch.delays.hack },
        { script: "/managers/scripts/grow.js", threads: batch.threads.grow, delay: batch.delays.grow },
        { script: "/managers/scripts/weaken.js", threads: batch.threads.weaken2, delay: batch.delays.weaken2 },
    ];

    for (const { script, threads, delay } of scripts) {
        let remaining = threads;
        const ramCost = script.includes("weaken")
            ? ramPer.weaken
            : script.includes("hack")
                ? ramPer.hack
                : ramPer.grow;

        for (const host of hosts) {
            if (remaining <= 0) break;

            const maxThreads = Math.floor(host.ramAvailable / ramCost);
            if (maxThreads <= 0) continue;

            const threadsToRun = Math.min(remaining, maxThreads);
            const pid = ns.exec(script, host.hostName, threadsToRun, batch.target, delay, false, threadsToRun);

            if (pid !== 0) {
                host.ramAvailable -= threadsToRun * ramCost;
                remaining -= threadsToRun;
            }
        }

        if (remaining > 0) {
            ns.tprint(`⚠️ Not enough RAM to dispatch ${threads} threads of ${script} (missed ${remaining})`);
            return false;
        }
    }

    return true;
}


interface BatchThreads {
    hack: number;
    grow: number;
    weaken1: number;
    weaken2: number;
}

export function scaleBatchThreads(
    ns: NS,
    target: serverObject,
    baseThreads: BatchThreads,
    availableRam: number,
    scriptPaths = {
        hack: "/managers/scripts/hack.js",
        grow: "/managers/scripts/grow.js",
        weaken: "/managers/scripts/weaken.js",
    }
): BatchThreads {
    const ramPerThread = {
        hack: ns.getScriptRam(scriptPaths.hack),
        grow: ns.getScriptRam(scriptPaths.grow),
        weaken: ns.getScriptRam(scriptPaths.weaken),
    };

    let hackThreads = baseThreads.hack;

    while (hackThreads > 0) {
        const hackFraction = hackThreads * ns.hackAnalyze(target.hostName); // Still a percent (0 < x < 1)
        const stolenAmount = hackFraction * target.moneyMax; // Actual dollar value stolen
        const remainingMoney = target.moneyMax - stolenAmount;
        const growMultiplier = target.moneyMax / Math.max(1, remainingMoney);
        const growThreads = Math.ceil(ns.growthAnalyze(target.hostName, growMultiplier));



        const weaken1 = Math.ceil((hackThreads * serverConstants.serverFortifyAmount) / serverConstants.serverWeakenAmount);
        const weaken2 = Math.ceil((growThreads * serverConstants.serverFortifyAmount * 2) / serverConstants.serverWeakenAmount);

        const totalRamNeeded =
            hackThreads * ramPerThread.hack +
            growThreads * ramPerThread.grow +
            (weaken1 + weaken2) * ramPerThread.weaken;

        ns.tprint(`Total RAM needed: ${totalRamNeeded} // Available RAM: ${availableRam}`)

        if (totalRamNeeded <= availableRam) {
            return {
                hack: hackThreads,
                grow: growThreads,
                weaken1,
                weaken2,
            };
        }

        hackThreads = Math.round(hackThreads * 0.9); // Scale down by 10% each time
    }

    // Fallback to smallest viable batch
    return {
        hack: 1,
        grow: Math.ceil(ns.growthAnalyze(target.hostName, 1.1)),
        weaken1: 1,
        weaken2: 1,
    };
}


function rehydrateServers(ns: NS, rawData: any[]): Map<string, serverObject> {
    const map = new Map<string, serverObject>();
    for (const s of rawData) {
        const hydrated = new serverObject(ns, ns.getServer(s.hostName), s.parentServer);
        map.set(s.hostName, hydrated);
    }
    return map;
}

export async function updateServerMap(ns: NS, serverMap: Map<string, serverObject>) {
    await ns.exec("/managers/mapMan.js", "home")
    for (const [host, serverObj] of serverMap) {
        const updatedInfo = ns.getServer(host);
        const refreshed = new serverObject(ns, updatedInfo, serverObj.parentServer);
        serverMap.set(host, refreshed);
    }
}

async function maintenanceLoop(ns: NS) {
    buildToolBag(ns);
    // See if anything needs cracked
    const crackableServers = [...serverMap.values()].filter(server =>
        server.hasAdminRights === false &&
        (server.numOpenPortsRequired ?? Infinity) <= getToolCount(ns)
    );

    if (crackableServers.length > 0) {
        // Refresh the tool bag
        buildToolBag(ns);

        for (const curServer of crackableServers) {
            await crackServer(ns, curServer.hostName);
        }
    }

    //Update purchased servers
    await updatePurchasedServers(ns);

    //SCP files incase there are newer versions
    await scpFiles(ns);

    // Add a small delay to prevent fast looping
    await ns.sleep(100);
}


export function buildToolBag(ns: NS) {
    toolBag.clear(); // Clear out any previous state

    for (const [key, data] of Object.entries(hackingTools)) {
        const tool = new hackingTool(ns, data);
        tool.updateStatus(ns);
        toolBag.set(key, tool);
    }
}

function getToolCount(ns: NS) {
    return [...toolBag.values()].filter(tool => tool.purchasedTool).length;
}


async function crackServer(ns: NS, server: string) {
    const portsRequired = ns.getServerNumPortsRequired(server);
    const availableTools = [...toolBag.values()].filter(tool => tool.purchasedTool);

    for (const tool of availableTools) {
        const command = ns[tool.Command as keyof NS] as (host: string) => Promise<void>;
        await command(server);
    }

    // Only nuke if we have enough tools to satisfy required ports
    if (availableTools.length >= portsRequired) {
        ns.nuke(server);
    }
}


async function updatePurchasedServers(ns: NS) {
    const playerInfo = getPlayerInfo(ns);
    const maxSpend = playerInfo.money * serverConstants.maxPercentageToSpendPerUpgrade;

    const purchasedServers = [...serverMap.values()]
        .filter(server => server.purchasedByPlayer === true && server.hostName !== "home");

    // Try to purchase as many new servers as possible
    while (
        purchasedServers.length < serverConstants.limitPurchasedServer &&
        serverConstants.minGBPurchasedServer * serverConstants.costPerGBServer <= maxSpend
    ) {
        const newName = serverConstants.nameRootPurchasedServer + purchasedServers.length;
        const cost = serverConstants.minGBPurchasedServer * serverConstants.costPerGBServer;

        const newServer = ns.purchaseServer(newName, serverConstants.minGBPurchasedServer);
        if (newServer.length > 0) {
            playerInfo.money -= cost;
            purchasedServers.push({ hostName: newName, ramMax: serverConstants.minGBPurchasedServer, purchasedByPlayer: true } as serverObject);
        } else {
            break; // Stop if purchase failed
        }
    }

    // Sort existing servers by RAM (ascending) so we upgrade weakest first
    const sortedServers = purchasedServers.sort((a, b) => a.ramMax - b.ramMax);

    // Try to upgrade as many as we can afford
    for (const curServer of sortedServers) {
        const newRam = curServer.ramMax * 2;
        const upgradeCost = newRam * serverConstants.costPerGBServer;

        if (upgradeCost <= playerInfo.money * serverConstants.maxPercentageToSpendPerUpgrade) {
            const success = ns.upgradePurchasedServer(curServer.hostName, newRam);
            if (success) {
                playerInfo.money -= upgradeCost;
                curServer.ramMax = newRam;
            } else {
                break; // Stop if upgrade failed
            }
        } else {
            break; // Stop if we can't afford further upgrades
        }
    }
}


function getPlayerInfo(ns: NS) {
    return ns.getPlayer();
}

async function scpFiles(ns: NS) {
    ns.disableLog("scp"); // Suppress logs about overwriting files

    const crackedServers = [...serverMap.values()]
        .filter(server => server.hasAdminRights && server.ramMax > 0);

    for (const server of crackedServers) {
        await ns.scp(filesToSCP, server.hostName);
        // ns.print(`Files sent to ${server.hostName}`);
    }
}

export async function calculateBatchingScore(ns: NS, server: serverObject, player: Person): Promise<number> {
    if (!server.hasAdminRights || server.moneyMax <= 0) return 0;

    const percentMoneyHacked = await ns.hackAnalyze(server.hostName);
    const hackTime = await ns.getHackTime(server.hostName);
    const growTime = hackTime * 3.2;
    const weakenTime = hackTime * 4;

    const moneyFactor = server.moneyMax * percentMoneyHacked;
    const timeFactor = 1 / (hackTime + 2 * weakenTime + growTime);
    const successFactor = Math.min(1, player.skills.hacking / server.hackDifficulty);

    const batchingScore = moneyFactor * timeFactor * successFactor;
    return batchingScore;
}


export function calculateThreads(ns: NS, server: serverObject): number {
    return ns.hackAnalyzeThreads(server.hostName, server.moneyMax * serverConstants.hackAmountToSteal);

}

function getCurrentAvailableRAM(serverMap: Map<string, serverObject>): number {
    let total = 0;

    for (const server of serverMap.values()) {
        if (!server.hasAdminRights) continue;

        // Reserve 2% of home RAM
        if (server.hostName === "home") {
            const reserved = server.ramMax * 0.02;
            total += Math.max(0, server.ramAvailable - reserved);
        } else {
            total += server.ramAvailable;
        }
    }

    return total;
}


