import { NS } from "@ns";
import { serverObject } from "/classes/classServer";

export async function main(ns: NS) {
    const args = ns.args;
    if (args.length === 0) {
        ns.tprint("❌ Please provide a target hostname.");
        return;
    }

    const hostname = args[0] as string;
    const targetServer = new serverObject(ns, await ns.getServer(hostname),"");

    // Option 1: Print individual properties
    // ns.tprint(`🔍 Info for ${hostname}:`);
    // ns.tprint(`  RAM: ${targetServer.ramMax}GB`);
    // ns.tprint(`  Money: $${ns.formatNumber(targetServer.moneyAvailable)} / $${ns.formatNumber(targetServer.moneyMax)}`);
    // ns.tprint(`  Security: ${targetServer.hackDifficulty} / ${targetServer.minDifficulty}`);

    // Option 2: Loop over keys if you want everything:
    for (const [key, value] of Object.entries(targetServer)) {
        ns.tprint(`${key}: ${value}`);
    }
}

