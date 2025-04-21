import { NS } from "@ns";
import { readAndParseJSON } from "/libraries/helpers";
import { globalFiles, hackingTools, serverConstants } from "/libraries/constants";
import { serverObject } from "/classes/classServer";
import { hackingTool } from "/classes/classToolBag";
import { Person } from "@ns";
import { filesToSCP } from "/libraries/constants";
import { Batch } from "/libraries/types";

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
        ns.tprint("Top of main loop")
        await maintenanceLoop(ns);
        await prepAllServers(ns, serverMap);
        await sendMaxBatches(ns);
        await ns.sleep(1000);
    }

}

export async function prepAllServers(ns: NS, serverMap: Map<string, serverObject>) {
    const weakenScript = "/managers/scripts/weaken.js";
    const growScript = "/managers/scripts/grow.js";

    const hosts = [...serverMap.values()].filter(s => s.hasAdminRights && s.ramAvailable > 0);
    const targets = [...serverMap.values()].filter(s =>
        s.hasAdminRights &&
        (s.moneyAvailable < s.moneyMax || s.hackDifficulty > s.minDifficulty)
    );

    if (targets.length === 0) {
        ns.tprint("✅ No prep needed. All servers are at full money and min security.");
        return;
    }

    // Target server with the fastest weaken time
    const target = targets.reduce((a, b) =>
        ns.getWeakenTime(a.hostName) < ns.getWeakenTime(b.hostName) ? a : b
    );

    ns.tprint(`🎯 Prepping ${target.hostName} (Sec: ${target.hackDifficulty}/${target.minDifficulty}, Money: ${ns.formatNumber(target.moneyAvailable)} / ${ns.formatNumber(target.moneyMax)})`);

    // Calculate threads
    const secDiff = target.hackDifficulty - target.minDifficulty;
    const weakenThreads1 = Math.ceil(secDiff / ns.weakenAnalyze(1));

    const growRatio = target.moneyMax / Math.max(1, target.moneyAvailable);
    const growThreads = Math.ceil(ns.growthAnalyze(target.hostName, growRatio));

    const secGrow = growThreads * serverConstants.serverFortifyAmount;
    const weakenThreads2 = Math.ceil(secGrow / ns.weakenAnalyze(1));

    const wTime = ns.getWeakenTime(target.hostName);
    const gTime = ns.getGrowTime(target.hostName);

    const delaySpacing = 200;
    const delays = {
        weaken1: 0,
        grow: delaySpacing,
        weaken2: delaySpacing * 2,
    };

    // RAM per thread
    const ramW = ns.getScriptRam(weakenScript);
    const ramG = ns.getScriptRam(growScript);

    // Track used threads
    let w1Left = weakenThreads1;
    let gLeft = growThreads;
    let w2Left = weakenThreads2;

    // Clone RAM state
    const ramHosts = hosts.map(h => ({ ...h }));

    // Dispatch all weaken1
    for (const host of ramHosts) {
        if (w1Left <= 0) break;

        const maxThreads = Math.floor(host.ramAvailable / ramW);
        if (maxThreads <= 0) continue;

        const threads = Math.min(maxThreads, w1Left);
        const pid = ns.exec(weakenScript, host.hostName, threads, target.hostName, delays.weaken1, false, threads);
        if (pid !== 0) {
            host.ramAvailable -= threads * ramW;
            w1Left -= threads;
        }
    }

    // Dispatch grow
    for (const host of ramHosts) {
        if (gLeft <= 0) break;

        const maxThreads = Math.floor(host.ramAvailable / ramG);
        if (maxThreads <= 0) continue;

        const threads = Math.min(maxThreads, gLeft);
        const pid = ns.exec(growScript, host.hostName, threads, target.hostName, delays.grow, false, threads);
        if (pid !== 0) {
            host.ramAvailable -= threads * ramG;
            gLeft -= threads;
        }
    }

    // Dispatch weaken2
    for (const host of ramHosts) {
        if (w2Left <= 0) break;

        const maxThreads = Math.floor(host.ramAvailable / ramW);
        if (maxThreads <= 0) continue;

        const threads = Math.min(maxThreads, w2Left);
        const pid = ns.exec(weakenScript, host.hostName, threads, target.hostName, delays.weaken2, false, threads);
        if (pid !== 0) {
            host.ramAvailable -= threads * ramW;
            w2Left -= threads;
        }
    }

    // Feedback
    if (w1Left > 0 || gLeft > 0 || w2Left > 0) {
        ns.tprint(`⚠️ Incomplete prep: W1=${w1Left}, G=${gLeft}, W2=${w2Left}`);
    }

    const endTime = performance.now() + wTime + delays.weaken2;
    const sleepTime = endTime - performance.now();

    if (sleepTime > 0) {
        ns.tprint(`⏳ Sleeping ${Math.round(sleepTime / 1000)}s while prepping ${target.hostName}...`);
        await ns.sleep(sleepTime);
    }
}

function selectBestTarget(serverMap: Map<string, serverObject>): string | null {
    const candidates = [...serverMap.values()].filter(s => s.hasAdminRights && s.moneyMax > 0);

    if (candidates.length === 0) return null;

    // Group by order of magnitude of moneyMax
    const grouped = new Map<number, serverObject[]>();
    for (const s of candidates) {
        const magnitude = Math.floor(Math.log10(s.moneyMax));
        if (!grouped.has(magnitude)) grouped.set(magnitude, []);
        grouped.get(magnitude)?.push(s);
    }

    // Find the group with the highest magnitude
    const maxMagnitude = Math.max(...grouped.keys());
    const topGroup = grouped.get(maxMagnitude)!;

    // From the top group, pick the server with the highest growth
    const best = topGroup.reduce((a, b) => (a.serverGrowth > b.serverGrowth ? a : b));
    return best.hostName;
}

async function sendMaxBatches(ns: NS) {
    const targetHost = selectBestTarget(serverMap);
    if (!targetHost) {
        ns.tprint("❌ No valid target selected.");
        return;
    }

    const target = serverMap.get(targetHost);
    if (!target || !target.isPrepped()) return;

    const availableHosts = [...serverMap.values()]
        .filter(h => h.hasAdminRights && h.ramAvailable > 0)
        .map(h => Object.assign({}, h)); // Clone to allow ram tracking during dispatch

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
    ns.tprint(`Security Level after batch: ${target.hackDifficulty}`)
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

    const hackAmount = target.moneyMax * serverConstants.hackAmountToSteal;

    const baseThreads = {
        hack: Math.max(1, Math.floor(ns.hackAnalyzeThreads(target.hostName, hackAmount))),
        grow: Math.max(1, Math.ceil(ns.growthAnalyze(
            target.hostName,
            1.2 * (target.moneyMax) / Math.max(1, target.moneyMax - hackAmount)
        ))),
        weaken1: Math.max(1, Math.ceil(
            (hackAmount * serverConstants.serverFortifyAmount * 1.1) / serverConstants.serverWeakenAmount
        )),
        weaken2: Math.max(1, Math.ceil(
            (hackAmount * serverConstants.serverFortifyAmount * 2 * 1.1) / serverConstants.serverWeakenAmount
        )),
    };

    const totalAvailableRam = availableHosts.reduce((sum, host) => sum + host.ramAvailable, 0);
    const scaledThreads = scaleBatchThreads(ns, baseThreads, totalAvailableRam);

    const ramPerHack = ns.getScriptRam("/managers/scripts/hack.js");
    const ramPerGrow = ns.getScriptRam("/managers/scripts/grow.js");
    const ramPerWeaken = ns.getScriptRam("/managers/scripts/weaken.js");

    const ramH = scaledThreads.hack * ramPerHack;
    const ramG = scaledThreads.grow * ramPerGrow;
    const ramW = (scaledThreads.weaken1 + scaledThreads.weaken2) * ramPerWeaken;

    const totalRamPerBatch = ramH + ramG + ramW;
    const maxBatches = Math.floor(totalAvailableRam / totalRamPerBatch);

    ns.tprint(`📦 RAM per batch: ${ns.formatRam(totalRamPerBatch)}`);
    ns.tprint(`📦 Total available RAM: ${ns.formatRam(totalAvailableRam)}`);
    ns.tprint(`📦 Max batches: ${maxBatches}`);

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
        const ram = script.includes("weaken") ? ramPer.weaken : script.includes("hack") ? ramPer.hack : ramPer.grow;

        for (const host of hosts) {
            const maxThreads = Math.floor(host.ramAvailable / ram);
            if (maxThreads <= 0) continue;

            const runThreads = Math.min(remaining, maxThreads);
            const pid = ns.exec(script, host.hostName, runThreads, batch.target, delay, false, runThreads);

            if (pid !== 0) {
                remaining -= runThreads;
                host.ramAvailable -= ram * runThreads;
            }

            if (remaining <= 0) break;
        }

        if (remaining > 0) {
            ns.tprint(`⚠️ Batch failed to launch ${script} completely.`);
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

    const totalRamNeeded =
        baseThreads.hack * ramPerThread.hack +
        baseThreads.grow * ramPerThread.grow +
        (baseThreads.weaken1 + baseThreads.weaken2) * ramPerThread.weaken;

    const scale = Math.min(1, (availableRam * .95) / totalRamNeeded);

    return {
        hack: Math.max(1, Math.floor(baseThreads.hack * scale)),
        grow: Math.max(1, Math.ceil(baseThreads.grow * scale)),
        weaken1: Math.max(1, Math.ceil(baseThreads.weaken1 * scale)),
        weaken2: Math.max(1, Math.ceil(baseThreads.weaken2 * scale)),
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
    ns.tprint("Running maintenance")
    buildToolBag(ns);
    // See if anything needs cracked
    const crackableServers = [...serverMap.values()].filter(server =>
        server.hasAdminRights === false &&
        (server.numOpenPortsRequired ?? Infinity) <= getToolCount(ns)
    );
    ns.tprint(`Checking crackables... Tool count: ${getToolCount(ns)}, Crackables: ${crackableServers.length}`);

    if (crackableServers.length > 0) {
        // Refresh the tool bag
        buildToolBag(ns);

        for (const curServer of crackableServers) {
            await crackServer(ns, curServer.hostName);
        }
    }

    //Update purchased servers
    await updatePurchasedServers(ns);

    // Update serverMap
    await updateServerMap(ns, serverMap);

    //Send the files incase  there is updates
    await scpFiles(ns);

    //Batch Time!

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
    return toolBag.size;
}

async function crackServer(ns: NS, server: string) {
    const availableTools = [...toolBag.values()].filter(tool => tool.purchasedTool);

    for (const tool of availableTools) {
        const command = ns[tool.Command as keyof NS] as (host: string) => Promise<void>;
        await command(server);
    }
    ns.nuke(server)
}

async function updatePurchasedServers(ns: NS) {
    const playerInfo = getPlayerInfo(ns);
    const purchasedServers = [...serverMap.values()].filter(server => server.purchasedByPlayer === true && server.hostName != "home");
    if (purchasedServers.length < serverConstants.limitPurchasedServer && (serverConstants.minGBPurchasedServer * serverConstants.costPerGBServer) < (playerInfo.money * serverConstants.maxPercentageToSpendPerUpgrade)) {
        const newServer = ns.purchaseServer(serverConstants.nameRootPurchasedServer + purchasedServers.length, serverConstants.minGBPurchasedServer);
        if (newServer.length > 0) { playerInfo.money -= serverConstants.minGBPurchasedServer * serverConstants.costPerGBServer }
    } else {
        const sortedServers = purchasedServers.sort((a, b) => a.ramMax - b.ramMax);
        for (const curServer of sortedServers) {
            if ((curServer.ramMax * serverConstants.costPerGBServer) < (playerInfo.money * serverConstants.maxPercentageToSpendPerUpgrade)) {
                const newServer = ns.upgradePurchasedServer(curServer.hostName, curServer.ramMax * 2);
                if (newServer === true) { playerInfo.money -= curServer.ramMax * serverConstants.costPerGBServer; }
            }
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
