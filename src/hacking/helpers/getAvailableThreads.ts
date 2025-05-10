import { NS } from "@ns";
// @ts-ignore
import {allServers} from "/server/allServers.js"
import { scriptConstants } from "../constants";

export function getAvailableThreads(ns:NS) {
    ns.disableLog("ALL")
    let availThreads = 0;
    for(const server of allServers){
        const ramMax = ns.getServerMaxRam(server);
        const ramUsed = ns.getServerUsedRam(server);
        const threadsAvail = Math.floor((ramMax-ramUsed)/scriptConstants.ramCostThread);
        if(ns.hasRootAccess(server)){
        availThreads += threadsAvail;
        }
    }
    return availThreads;    
}
export function getAvailableServerThreads(ns:NS,targetServer:string){
    ns.disableLog("ALL")
    return Math.floor((ns.getServerMaxRam(targetServer)-ns.getServerUsedRam(targetServer))/scriptConstants.ramCostThread);
}