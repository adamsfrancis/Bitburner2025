import { NS } from "@ns";
import { homeServer } from "/globalConstants";

/** @RAM 0.2 GB */
export async function getServerStructure(ns: NS) {
    const discoveredServers: string[] = [];

    discoveredServers.push(homeServer)

    function discover(server: string) {
        const adjacent = ns.scan(server);

        for (const neighbor of adjacent) {
            if (!discoveredServers.some(s => s === neighbor) && neighbor !== "darkweb") {
                discoveredServers.push(neighbor);
                discover(neighbor);
            }
        }
    }

    discover(homeServer);

    return discoveredServers;
}