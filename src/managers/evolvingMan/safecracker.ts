import { NS } from "@ns";
import { evolvingManFiles } from "/libraries/constants";

interface lightweightServer {
    host: string;
    parent: string | undefined;
    path: string[];
}

/** @RAM ~4.4GB */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const target = ns.args[0] as string;
    if (!target) {
        ns.tprint("ERROR: No target server specified.");
        return;
    }

    // Return to home if not already there
    if (ns.getHostname() !== "home") {
        await ns.singularity.connect("home");
    }

    // Load the scouting report
    const data = await ns.read(evolvingManFiles.scoutingReport) as string;
    const servers: lightweightServer[] = JSON.parse(data);

    const serverInfo = servers.find(s => s.host === target);

    if (!serverInfo) {
        ns.tprint(`ERROR: Target ${target} not found in scouting report.`);
        return;
    }

    // Walk the path to the target
    for (const hop of serverInfo.path) {
        if (ns.getHostname() !== hop) {
            await ns.singularity.connect(hop);
        }
    }

    // Install the backdoor
    await ns.singularity.installBackdoor();
    ns.print(`SUCCESS: Backdoor installed on ${target}.`);
}
