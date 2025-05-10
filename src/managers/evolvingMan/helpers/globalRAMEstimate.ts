import { NS,Server } from "@ns";

export function estimateGlobalRAM(ns: NS, serverData: Server[]): number {
    let globalRAM = 0;
    for (const server of serverData) {
        if (server.hasAdminRights) {
            globalRAM += server.maxRam - server.ramUsed;
        }
    }
    return globalRAM;
}
