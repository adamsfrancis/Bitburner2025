// scoutMan.js
import { NS } from "@ns";
import { serverObject } from "/classes/classServer";
import { evolvingManFiles } from "/libraries/constants";



/** @RAM 0.2 GB */
export async function getServerStructure(ns: NS): Promise<Map<string, string | undefined>> {
    /** Initial run variable setup, we want to start from "home", and follow the network from there.
     *  Since home is the base level, it's parent will be null. Saving parents for possible backdoor
     *  shennanigans later.
     */

    const startingServer = "home";
    const discoveredServers: Map<string, string | undefined> = new Map();
    discoveredServers.set(startingServer, undefined);

    // Function to recursively discover servers
    function discoverServers(server: string) {
        const adjacentServers = ns.scan(server);
        for (const serverName of adjacentServers) {
            if (!discoveredServers.has(serverName) && serverName !== "darkweb") {
                discoveredServers.set(serverName, server);
                discoverServers(serverName);
            }
        }
    }
    await discoverServers(startingServer);
    return discoveredServers;
}


/** @RAM 2 GB */
export async function getAllServerInfo(ns: NS, serverMap: Map<string, string | undefined>): Promise<serverObject[]> {
    return Array.from(serverMap.entries()).map(([host, parent]) =>
        new serverObject(ns, ns.getServer(host), parent)
    );
}

export async function main(ns:NS):Promise<void> {
    ns.disableLog("ALL");



    // Map this ascension's server map.
    const initialServerMap = await getServerStructure(ns);

    // Get all initial server information.
    const filledServerMap = await getAllServerInfo(ns,initialServerMap);

    await ns.write(evolvingManFiles.scoutingReport,JSON.stringify(filledServerMap),"w")

}
