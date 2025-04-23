import { NS } from "@ns";

const target = "joesguns";
const weakenScript = "/managers/scripts/weaken.js";
const growScript = "/managers/scripts/grow.js";
const daemonScript = "/managers/daemon.js";

// This value will only be used if a target goal is passed.
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const ramW = ns.getScriptRam(weakenScript);
    const ramG = ns.getScriptRam(growScript);

    // Check if argument was passed for goalHackingLevel
    const args = ns.args;
    const goalArg = args[0];
    const stopAtLevel = goalArg && !isNaN(Number(goalArg)) ? Number(goalArg) : null;

    // Get all owned servers
    const allServers = ns.getPurchasedServers();
    allServers.push("home"); // Include home in the server list

    // --- PHASE 1: Prep target with GW batches ---
    while (true) {
        const secDiff = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
        const moneyLow = ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target);
        if (!moneyLow && secDiff <= 0.1) break;

        const rawAvailableRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
        const availableRam = rawAvailableRam * 0.95;

        // GW ratio: 12.5 grow threads => 1 weaken thread
        // Total RAM per grow+weaken "unit"
        const unitGrow = 1;
        const unitWeaken = unitGrow * 0.004 / 0.05; // 12.5 weaken units per grow to counteract sec
        const ramPerUnit = (unitGrow * ramG) + (unitWeaken * ramW);

        const units = Math.floor(availableRam / ramPerUnit);
        const growThreads = Math.max(1, Math.floor(units * unitGrow));
        const weakenThreads = Math.ceil(units * unitWeaken);

        const totalRamNeeded = growThreads * ramG + weakenThreads * ramW;
        if (totalRamNeeded > availableRam) {
            await ns.sleep(100); // Wait for RAM to free up
            continue;
        }

        const gPid = ns.exec(growScript, "home", growThreads, target, 0, false);
        const wPid = ns.exec(weakenScript, "home", weakenThreads, target, 0, false);

        if (gPid === 0 || wPid === 0) {
            ns.tprint(`⚠️ Failed to launch GW batch. G:${gPid} W:${wPid} | RAM: ${ns.formatRam(totalRamNeeded)} / ${ns.formatRam(availableRam)}`);
        }

        const waitTime = Math.max(ns.getGrowTime(target), ns.getWeakenTime(target));
        const moneyPct = (ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target)) * 100;
        await showProgress(
            ns,
            `[Phase 1 - GW Batch] G:${growThreads} W:${weakenThreads} | $: ${moneyPct.toFixed(1)}%`,
            waitTime
        );
    }

    ns.tprint(`✅ ${target} prepped. Farming XP until hacking level >= ${stopAtLevel || "infinity"}...`);

    // --- PHASE 2: XP farming with grow ---
    let lastGrowTime = 0;
    while (stopAtLevel === null || ns.getHackingLevel() < stopAtLevel) {
        // Iterate over all servers and utilize available RAM for grow script
        for (const server of allServers) {
            const freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const threads = Math.floor(freeRam / ramG);
            if (threads > 0) {
                const time = ns.getGrowTime(target);
                const pid = ns.exec(growScript, server, threads, target, 0, false);
                if (pid === 0) {
                    ns.tprint(`⚠️ Failed to launch grow XP farm on ${server} with ${threads} threads.`);
                }
                lastGrowTime = time;
            }
        }

        const progress = (ns.getHackingLevel() / (stopAtLevel || ns.getHackingLevel())) * 100;
        ns.clearLog();
        ns.print(`[Phase 2 - XP Farm] Hacking Level: ${ns.getHackingLevel()}${stopAtLevel !== null ? `/${stopAtLevel}` : ""}`);
        ns.print(generateProgressBar(progress));
        await ns.sleep(200);
    }

    ns.tprint(`🎉 Hacking level reached ${stopAtLevel}. Waiting for final grow batch (~${ns.tFormat(lastGrowTime)})...`);
    await showProgress(ns, "[Phase 2 - Final Grow]", lastGrowTime);

    // --- PHASE 3: Launch main daemon if level is specified ---
    if (stopAtLevel !== null && !ns.isRunning(daemonScript)) {
        ns.run(daemonScript, 1);
        ns.tprint("🚀 Daemon started.");
    } else if (stopAtLevel === null) {
        ns.tprint("ℹ️ Running indefinitely, no daemon spawned.");
    } else {
        ns.tprint("ℹ️ Daemon already running.");
    }
}

async function showProgress(ns: NS, label: string, duration: number) {
    const interval = 200;
    const steps = Math.floor(duration / interval);
    for (let i = 0; i <= steps; i++) {
        const percent = (i / steps) * 100;
        ns.clearLog();
        ns.print(`${label} ${generateProgressBar(percent)}`);
        await ns.sleep(interval);
    }
}

function generateProgressBar(percent: number): string {
    const barLength = 40;
    const filledLength = Math.floor((percent / 100) * barLength);
    const emptyLength = barLength - filledLength;
    return `[${'█'.repeat(filledLength)}${' '.repeat(emptyLength)}] ${percent.toFixed(0)}%`;
}
