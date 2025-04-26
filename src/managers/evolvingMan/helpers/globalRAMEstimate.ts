import { NS } from "@ns";
import { serverObject } from "/classes/classServer";

export function estimateGlobalRAM(ns: NS, serverData: Map<string, serverObject>): number {
    let globalRAM = 0;
    for (const [, server] of serverData) {
        if (server.hasAdminRights) {
            globalRAM += server.ramMax - server.ramUsed;
        }
    }
    return globalRAM;
}
