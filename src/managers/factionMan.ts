import { NS, CrimeType } from "@ns";

export async function main(ns: NS) {
    const ownedAugs = () => ns.singularity.getOwnedAugmentations(true);

    const getBestFactionTarget = () => {
        const joinedFactions = ns.getPlayer().factions;
        const targets: { faction: string, aug: string, repNeeded: number, currentRep: number }[] = [];

        for (const faction of joinedFactions) {
            const neededAugs = ns.singularity.getAugmentationsFromFaction(faction)
                .filter(aug => !ownedAugs().includes(aug));

            if (neededAugs.length === 0) continue;

            let topAug = "";
            let maxRep = 0;
            for (const aug of neededAugs) {
                const rep = ns.singularity.getAugmentationRepReq(aug);
                if (rep > maxRep) {
                    maxRep = rep;
                    topAug = aug;
                }
            }

            const currentRep = ns.singularity.getFactionRep(faction);
            if (currentRep < maxRep) {
                targets.push({ faction, aug: topAug, repNeeded: maxRep, currentRep });
            }
        }

        targets.sort((a, b) => a.repNeeded - b.repNeeded);
        return targets[0]; // Target with lowest maxRep
    };

    const crimes = Object.values(ns.enums.CrimeType) as CrimeType[];

    const getBestCrime = (): CrimeType => {
        let bestCrime: CrimeType = crimes[0];
        let bestRate = 0;

        for (const crime of crimes) {
            const stats = ns.singularity.getCrimeStats(crime);
            const successChance = ns.singularity.getCrimeChance(crime);
            const expectedMoney = stats.money * successChance;
            const moneyPerSecond = expectedMoney / (stats.time / 1000);

            if (moneyPerSecond > bestRate) {
                bestRate = moneyPerSecond;
                bestCrime = crime;
            }
        }

        return bestCrime;
    };

    const workTypes = ["hacking", "security", "field"] as const;
    let lastTarget: string | null = null;

    while (true) {
        const target = getBestFactionTarget();

        if (target) {
            if (lastTarget !== target.faction) {
                ns.tprint(`🎯 New faction target: ${target.faction} for ${target.aug} (${target.currentRep.toFixed(0)}/${target.repNeeded})`);
                
                let started = false;
                for (const work of workTypes) {
                    if (ns.singularity.workForFaction(target.faction, work, false)) {
                        ns.tprint(`🛠️ Working ${work} for ${target.faction}`);
                        started = true;
                        break;
                    }
                }

                if (!started) {
                    ns.tprint(`❌ Failed to work for ${target.faction}`);
                }

                lastTarget = target.faction;
            }
        } else {
            const crime = getBestCrime();
            if (lastTarget !== crime) {
                ns.tprint(`🔫 No faction work to do, committing ${crime} for money.`);
                ns.singularity.commitCrime(crime, false);
                lastTarget = crime;
            }
        }

        await ns.sleep(10_000); // Check every 10 seconds
    }
}
