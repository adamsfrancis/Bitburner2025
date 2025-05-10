import { NS } from "@ns";
import { allFactions } from "/globalConstants";

export async function main(ns: NS) {
    const playerAugs = ns.singularity.getOwnedAugmentations(true);

    for (const faction of allFactions) {
        const allAugs = ns.singularity.getAugmentationsFromFaction(faction);
        const unownedAugs = allAugs.filter(aug => !playerAugs.includes(aug));

        if (unownedAugs.length > 0) {
            ns.tprint(`\n=== ${faction} ===`);
            ns.tprint(unownedAugs);
        }
    }
}
