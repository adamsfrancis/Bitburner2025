import { NS } from "@ns";
// @ts-ignore
import {allServers} from "/server/allServers.js"
import { scriptConstants } from "../constants";

export function getUsableServerList(ns: NS) {
    const targetList: string[] = []
    for (const server of allServers) {
        const availableThreads = (ns.getServerMaxRam(server) - ns.getServerUsedRam(server))/scriptConstants.ramCostThread;
        if(ns.hasRootAccess(server) && availableThreads > 0){
            targetList.push(server)
        }
    }
    return targetList;
}