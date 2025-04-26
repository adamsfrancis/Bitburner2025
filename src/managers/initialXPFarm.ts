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
    await scpNeededFiles(ns,allServers)

    // --- PHASE 1: Prep target with W first, then GW batches ---
    while (true) {
        await scpNeededFiles(ns,allServers)
        const secDiff = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
        const moneyLow = ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target);

        // First: If security is too high, focus only on weaken
        if (secDiff > 0.1) {
            for (const server of allServers) {
                let availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);

                const maxWeakenThreads = Math.floor(availableRam / ramW);
                if (maxWeakenThreads <= 0) continue;

                const wPid = ns.exec(weakenScript, server, maxWeakenThreads, target, 0, false);
                if (wPid === 0) {
                    ns.tprint(`⚠️ Failed to launch weaken on ${server} with ${maxWeakenThreads} threads. Free RAM: ${ns.formatRam(availableRam)} | Weaken RAM: ${ns.formatRam(ramW)}`);
                }
            }

            const waitTime = ns.getWeakenTime(target);
            await showProgress(ns, `[Phase 1 - Weakening] SecDiff: ${secDiff.toFixed(2)}`, waitTime);
            continue; // Always recheck security after weaken phase
        }

        // Second: Security is fine, but money is low -> do GW batch
        if (moneyLow) {
            for (const server of allServers) {
                let availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);

                // Try to launch a GW batch, scale down if necessary
                const unitGrow = 1;
                const unitWeaken = unitGrow * 0.004 / 0.05; // 12.5 ratio
                const ramPerUnit = (unitGrow * ramG) + (unitWeaken * ramW);

                let units = Math.floor(availableRam / ramPerUnit);
                if (units < 1) continue;

                let growThreads = Math.max(1, Math.floor(units * unitGrow));
                let weakenThreads = Math.ceil(units * unitWeaken);

                let totalRamNeeded = (growThreads * ramG) + (weakenThreads * ramW);

                // If we don't fit, scale down by 90% each attempt
                while (totalRamNeeded > availableRam) {
                    units = Math.floor(units * 0.9);
                    growThreads = Math.max(1, Math.floor(units * unitGrow));
                    weakenThreads = Math.ceil(units * unitWeaken);
                    totalRamNeeded = (growThreads * ramG) + (weakenThreads * ramW);
                    if (units < 1) break;
                }

                if (totalRamNeeded <= availableRam) {
                    const gPid = ns.exec(growScript, server, growThreads, target, 0, false);
                    const wPid = ns.exec(weakenScript, server, weakenThreads, target, 0, false);

                    if (gPid === 0 || wPid === 0) {
                        ns.tprint(`⚠️ Failed to launch GW batch on ${server}. G:${gPid} W:${wPid} | RAM: ${ns.formatRam(totalRamNeeded)} / ${ns.formatRam(availableRam)}`);
                    }
                }
            }

            const waitTime = Math.max(ns.getGrowTime(target), ns.getWeakenTime(target));
            const moneyPct = (ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target)) * 100;
            await showProgress(
                ns,
                `[Phase 1 - Growing] $: ${moneyPct.toFixed(1)}%`,
                waitTime
            );
            continue; // Loop and recheck after grow batches
        }

        // Third: If no secDiff and money full, target is fully prepped
        break;
    }

    ns.tprint(`✅ ${target} fully prepped. Moving to XP farm...`);


    // --- PHASE 2: XP farming with grow ---
    await scpNeededFiles(ns,allServers)
    let lastGrowTime = 0;
    while (stopAtLevel === null || ns.getHackingLevel() < stopAtLevel) {
        // Get available RAM across all servers
        const totalRam = allServers.reduce((total, server) => total + ns.getServerMaxRam(server) - ns.getServerUsedRam(server), 0);

        // Use all available RAM for grow script
        let growThreads = Math.floor(totalRam / ramG);
        if (growThreads > 0) {
            const time = ns.getGrowTime(target);
            for (const server of allServers) {
                const freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
                const threads = Math.min(growThreads, Math.floor(freeRam / ramG));

                if (threads > 0) {
                    const pid = ns.exec(growScript, server, threads, target, 0, false);
                    if (pid === 0) {
                        ns.tprint(`⚠️ Failed to launch grow XP farm on ${server} with ${threads} threads.`);
                    }
                    growThreads -= threads;
                    lastGrowTime = time;
                }
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
    await scpNeededFiles(ns,allServers)
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

async function scpNeededFiles(ns:NS,serverList:string[]){
    for(const server of serverList){
        await ns.scp(growScript,server);
        await ns.scp(weakenScript,server);
    }
}