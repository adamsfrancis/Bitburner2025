import { NS } from "@ns";

const shareScript = "/managers/scripts/share.js";
const delay = 10000; // 10 seconds

export async function main(ns: NS): Promise<void> {
    while (true) {
        const servers = scanAll(ns).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0);

        for (const server of servers) {
            const maxRam = ns.getServerMaxRam(server);
            const usedRam = ns.getServerUsedRam(server);
            const availableRam = maxRam - usedRam;
            const scriptRam = ns.getScriptRam(shareScript);
            const threads = Math.floor(availableRam / scriptRam);

            if (threads > 0) {
                await ns.scp(shareScript, server);
                ns.exec(shareScript, server, threads);
            }
        }

        await ns.sleep(delay);
    }
}

function scanAll(ns: NS, origin: string = "home", discovered: Set<string> = new Set()): string[] {
    discovered.add(origin);
    for (const server of ns.scan(origin)) {
        if (!discovered.has(server)) {
            scanAll(ns, server, discovered);
        }
    }
    return [...discovered];
}
