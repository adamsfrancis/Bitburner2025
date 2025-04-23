import { NS } from "@ns";
import { globalFiles } from "/libraries/constants";
import { serverObject } from "/classes/classServer";
import { readAndParseJSON } from "/libraries/helpers";
import { estimateProfitOver60Min,ServerProfitEstimate } from "/managers/helpers/estimateProfits";

// Function to get the top N servers based on profitability
function getTopServersByProfit(ns: NS, serverMap: Map<string, serverObject>, availableRAM: number, topN: number): ServerProfitEstimate[] {
    // Estimate the profit for each server
    const profitEstimates: ServerProfitEstimate[] = [];

    // Iterate over the servers and estimate their profit
    for (const server of serverMap.values()) {
        const estimate = estimateProfitOver60Min(ns, server, availableRAM);
        profitEstimates.push(estimate);
    }

    // Sort by total profit in descending order
    profitEstimates.sort((a, b) => b.totalMoneyIn60Min - a.totalMoneyIn60Min);

    // Return the top N servers
    return profitEstimates.slice(0, topN);
}

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    const serverMap = new Map<string, serverObject>();
    const topN = 10; // Number of top servers to analyze
    const availableRAM = ns.getServerMaxRam("home"); // Example RAM value, adjust based on your use case

    // Get the initial server map from storage and parse it
    const rawMap = await readAndParseJSON<any[]>(ns, globalFiles["serverMap"]);

    // Format the raw data into serverObjects
    const rehydrated = rehydrateServers(ns, rawMap);

    // Store serverObjects in serverMap
    serverMap.clear();
    for (const [host, server] of rehydrated) {
        serverMap.set(host, server);
    }

    // Get the top N profitable servers
    const topServers = getTopServersByProfit(ns, serverMap, availableRAM, topN);

    // Log the results
    ns.tprint("Top " + topN + " servers based on estimated 60-minute profit:");
    topServers.forEach((server, index) => {
        ns.tprint(`${index + 1}. ${server.host} - Estimated Profit: $${server.totalMoneyIn60Min.toFixed(2)}`);
    });
}

function rehydrateServers(ns: NS, rawData: any[]): Map<string, serverObject> {
    const map = new Map<string, serverObject>();
    for (const s of rawData) {
        const hydrated = new serverObject(ns, ns.getServer(s.hostName), s.parentServer);
        map.set(s.hostName, hydrated);
    }
    return map;
}
