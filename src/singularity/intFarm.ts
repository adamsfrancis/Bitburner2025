import { NS } from "@ns";

export async function main(ns:NS){
    const invs = ns.singularity.checkFactionInvitations()
    for(const inv of invs){
        await ns.singularity.joinFaction(inv)
    }
    await ns.singularity.softReset('/singularity/intFarm.js')
}