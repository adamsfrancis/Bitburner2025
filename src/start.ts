import { NS } from "@ns";
import { homeServer } from "./globalConstants";

const scriptList = [
    '/server/updateAllServers.js',
    '/server/managePurchased.js',
    '/server/serverRunner.js',
    '/singularity/autoWork.js',
    '/singularity/autoBackdoor.js',
    '/singularity/joinUsefulFactions.js',
    '/singularity/torManager.js',
    '/contracts/findAndSolve.js',
    '/hacking/batching/planBatch.js',
    '/playGo.js'
]

export async function main(ns:NS){
    for(const script of scriptList){
    ns.exec(script,homeServer);
    await ns.sleep(100);

    }
    
}