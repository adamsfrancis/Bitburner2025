import { NS } from "@ns";
import { evolvingManFiles } from "/libraries/constants";
import { lightweightServer } from "./interfaces/lightweightServer";

/** @RAM 0.2 GB */
export function getServerStructure(ns: NS): lightweightServer[] {
    const startingServer = "home";
    const discoveredServers: lightweightServer[] = []; // Store as array instead of Map
    
    discoveredServers.push({
        host: startingServer,
        parent: undefined,
        path: [startingServer],
    });

    function discover(server: string) {
        const adjacent = ns.scan(server);
        const currentPath = discoveredServers.find(s => s.host === server)?.path ?? [];

        for (const neighbor of adjacent) {
            if (!discoveredServers.some(s => s.host === neighbor) && neighbor !== "darkweb") {
                discoveredServers.push({
                    host: neighbor,
                    parent: server,
                    path: [...currentPath, neighbor],
                });
                discover(neighbor);
            }
        }
    }

    discover(startingServer);

    return discoveredServers;
}



export async function main(ns: NS): Promise<void> {
    ns.ui.openTail;
    ns.disableLog("ALL");

    const networkMap = getServerStructure(ns);

    await ns.write(evolvingManFiles.scoutingReport, JSON.stringify(networkMap), "w");
}

