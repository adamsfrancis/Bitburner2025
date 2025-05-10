import { NS } from "@ns";

export async function main(ns: NS):Promise<void> {

    while(true){
    const ownedAugs = ns.singularity.getOwnedAugmentations(true);
    const factionsToJoin = ns.singularity.checkFactionInvitations();

    for (const faction of factionsToJoin) {
        const factionAugs = ns.singularity.getAugmentationsFromFaction(faction);
        const unownedAugs = factionAugs
        .filter(aug => aug !== "NeuroFlux Governor")
        .filter(aug => !ownedAugs.includes(aug));
    
        if (unownedAugs.length > 0) {
            ns.singularity.joinFaction(faction);
            ns.tprint(`🤝 Joined faction: ${faction}`);
        }
    }
    await ns.sleep(10000);
}
}
