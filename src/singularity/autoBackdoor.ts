import { NS,Server } from "@ns";
// @ts-ignore
import { allServers } from "/server/allServers.js";
import { homeServer } from "/globalConstants";


export async function main(ns:NS){
    while(true){
        const serversList = getServersToBackdoor(ns);
        for(const server of serversList){
            connectToHost(ns,server.hostname)
            const success = await installBackdoorOnServer(ns, server);

        }





        await ns.sleep(10000)
    }
}

export function pathToTarget(ns: NS, entry: string, target: string): string[] {
    const queue: [string, string[]][] = [[entry, [entry]]];
    const visited = new Set<string>([entry]);

    while (queue.length > 0) {
        const [current, path] = queue.shift()!;
        if (current === target) return path;

        for (const neighbor of ns.scan(current)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([neighbor, [...path, neighbor]]);
            }
        }
    }
    return [];
}

export function connectToHost(ns: NS, target: string): boolean {
    const path = pathToTarget(ns, ns.getHostname(), target);
    if (path.length === 0) return false;

    for (const host of path) {
        ns.singularity.connect(host);
    }
    return true;
}

export async function installBackdoors(ns: NS) {
    ns.disableLog("sleep");

    const toBackdoor = getServersToBackdoor(ns);

    for (const server of toBackdoor) {
        const success = await installBackdoorOnServer(ns, server);
    }

    ns.tprint("🎉 All possible backdoors installed.");
}

function getServersToBackdoor(ns: NS): Server[] {
    const playerHack = ns.getPlayer().skills.hacking;
    const serversList:Server[] = []
    for(const server of allServers){
        serversList.push(ns.getServer(server));
    }
    return serversList
        .filter(s =>
            !s.backdoorInstalled &&
            s.hasAdminRights &&
            s.requiredHackingSkill !== undefined &&
            s.requiredHackingSkill <= playerHack &&
            s.purchasedByPlayer === false &&
            s.hostname !== homeServer
        );
}

export async function installBackdoorOnServer(ns: NS, server: Server): Promise<boolean> {
    if (server.backdoorInstalled || !server.hasAdminRights || server.requiredHackingSkill! > ns.getPlayer().skills.hacking) {
        return false;
    }

    const prevHost = ns.getHostname();

    if (!connectToHost(ns, server.hostname)) {
        ns.print(`⚠️ Failed to connect to ${server.hostname}`);
        return false;
    }

    await ns.singularity.installBackdoor();
    ns.tprint(`🔐 Installed backdoor on ${server.hostname}`);

    connectToHost(ns, prevHost);
    return true;
}

