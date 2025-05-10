import { NS } from "@ns";

export async function main(ns: NS) {
    const factions = ns.getPlayer().factions;
    const owned = new Set(ns.singularity.getOwnedAugmentations(true));
    const allAugs: { aug: string, faction: string, price: number }[] = [];

    for (const faction of factions) {
        const factionAugs = ns.singularity.getAugmentationsFromFaction(faction);

        for (const aug of factionAugs) {
            if (owned.has(aug)) continue;
            if (aug === "NeuroFlux Governor") continue; // Handle separately
            const price = ns.singularity.getAugmentationPrice(aug);
            const repReq = ns.singularity.getAugmentationRepReq(aug);
            const factionRep = ns.singularity.getFactionRep(faction);

            if (price <= ns.getServerMoneyAvailable("home") && factionRep >= repReq) {
                allAugs.push({ aug, faction, price });
            }
        }
    }

    // Sort most expensive first
    allAugs.sort((a, b) => b.price - a.price);

    for (const { aug, faction } of allAugs) {
        await buyWithPrereqs(ns, aug, faction, owned);
    }

    // Buy NeuroFlux Governor as many times as possible
    while (true) {
        let boughtOne = false;
        for (const faction of factions) {
            const price = ns.singularity.getAugmentationPrice("NeuroFlux Governor");
            const repReq = ns.singularity.getAugmentationRepReq("NeuroFlux Governor");
            const factionRep = ns.singularity.getFactionRep(faction);

            if (factionRep >= repReq && price <= ns.getServerMoneyAvailable("home")) {
                const success = ns.singularity.purchaseAugmentation(faction, "NeuroFlux Governor");
                if (success) {
                    ns.tprint(`🧠 Purchased NeuroFlux Governor from ${faction}`);
                    boughtOne = true;
                    break;
                }
            }
        }
        if (!boughtOne) break;
    }

    ns.tprint("🏁 Finished purchasing all augments.");
}

async function buyWithPrereqs(ns: NS, aug: string, faction: string, owned: Set<string>) {
    const prereqs = ns.singularity.getAugmentationPrereq(aug) || [];

    for (const pre of prereqs) {
        if (!owned.has(pre)) {
            // Find which faction sells the pre-requisite
            const availableFactions = ns.singularity.getAugmentationFactions(pre);
            const factionToUse = availableFactions.find(f => ns.getPlayer().factions.includes(f));
            if (!factionToUse) {
                ns.tprint(`⚠️ Cannot buy prerequisite ${pre} for ${aug} — no faction access.`);
                return;
            }

            await buyWithPrereqs(ns, pre, factionToUse, owned);
        }
    }

    // Check if we can afford it now
    const price = ns.singularity.getAugmentationPrice(aug);
    const repReq = ns.singularity.getAugmentationRepReq(aug);
    const factionRep = ns.singularity.getFactionRep(faction);

    if (price <= ns.getServerMoneyAvailable("home") && factionRep >= repReq) {
        const success = ns.singularity.purchaseAugmentation(faction, aug);
        if (success) {
            ns.tprint(`✅ Purchased ${aug} from ${faction}`);
            owned.add(aug); // Update owned set
        } else {
            ns.tprint(`❌ Failed to purchase ${aug} from ${faction}`);
        }
    } else {
        ns.tprint(`❌ Cannot afford or insufficient rep for ${aug} from ${faction}`);
    }
}
