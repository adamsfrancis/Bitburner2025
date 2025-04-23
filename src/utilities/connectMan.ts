import { NS } from "@ns";
import { globalFiles } from "/libraries/constants";
import { serverObject } from "/classes/classServer";

/** @RAM 1 GB */
export async function main(ns: NS) {
    const target = ns.args[0] as string;
    if (!target) {
        ns.tprint("❌ Usage: run connectMan.js <hostname>");
        return;
    }

    const serverData = JSON.parse(ns.read(globalFiles["serverMap"])) as serverObject[];
    const parentMap = new Map<string, string | undefined>();
    for (const s of serverData) {
        parentMap.set(s.hostName, s.parentServer);
    }

    if (!parentMap.has(target)) {
        ns.tprint(`❌ Server "${target}" not found in map.`);
        return;
    }

    const path: string[] = [];
    let current: string | undefined = target;
    while (current && current !== "home") {
        path.unshift(current);
        current = parentMap.get(current);
    }

    const connectCommand = path.map(s => `connect ${s}`).join(";");
    ns.tprint(`🔗 Path to ${target}:\n${connectCommand}`);
}
