import { NS } from "@ns";
import { scriptConstants } from "../constants";

export function calculateInitialWeakenThreads(ns:NS,serverName:string) {
    const currentSecurity = ns.getServerSecurityLevel(serverName);
    const minSecurity = ns.getServerMinSecurityLevel(serverName);
    const securityDifference = Math.max(0, currentSecurity - minSecurity);
    const threadsNeeded = Math.ceil(securityDifference/scriptConstants.serverWeakenAmount);    
    return threadsNeeded;
}

export function calculateWeakenTime(ns:NS,serverName:string){
    return ns.getWeakenTime(serverName);
}