import { NS } from "@ns";
import { globalFiles } from "/libraries/constants";
import { serverObject } from "/classes/classServer";

/** @RAM 1 GB */
export async function main(ns: NS) {
    await ns.exec('/managers/mapMan.js','home')
    const playerLevel = ns.getHackingLevel();
    const serverData = JSON.parse(ns.read(globalFiles["serverMap"])) as serverObject[];

    const parentMap = new Map<string, string | undefined>();
    for (const s of serverData) {
        parentMap.set(s.hostName, s.parentServer);
    }

    // Find the first server that needs a backdoor
    const target = serverData.find(s => {
        const realServer = ns.getServer(s.hostName);
        return !realServer.backdoorInstalled &&
            realServer.hasAdminRights &&
            typeof s.requiredHackingSkill === "number" &&
            s.requiredHackingSkill <= playerLevel &&
            s.hostName !== "home";
    });
    

    if (!target) {
        ns.tprint("✅ All eligible servers are already backdoored!");
        return;
    }

    // Build the path
    const path: string[] = [];
    let current: string | undefined = target.hostName;
    while (current && current !== "home") {
        path.unshift(current);
        current = parentMap.get(current);
    }

    const connectCommand = path.map(s => `connect ${s}`).join(";") + "; backdoor";
    ns.tprint(`🛠️ Next backdoor target: ${target.hostName}`);
    ns.tprint(`🔗 Path:\n${connectCommand}`);
}
