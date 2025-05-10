import { NS, CrimeType } from "@ns";

export async function main(ns: NS) {
    const ownedAugs = () => ns.singularity.getOwnedAugmentations(true);
    const crimes = Object.values(ns.enums.CrimeType) as CrimeType[];
    const workTypes = ["hacking", "security", "field"] as const;
    let lastTarget: string | null = null;

    interface AugmentTarget {
        faction: string;
        aug: string;
        repNeeded: number;
        currentRep: number;
        hackSkillMult: number;
        hackExpMult: number;
    }

    function extractHackingPower(augName: string) {
        const stats = ns.singularity.getAugmentationStats(augName);
        return {
            hackSkillMult: stats.hacking ?? 0,
            hackExpMult: stats.hacking_exp ?? 0
        };
    }

    function findBestAugTarget(): AugmentTarget | null {
        const player = ns.getPlayer();
        const joinedFactions = player.factions;
        const augTargets: AugmentTarget[] = [];

        for (const faction of joinedFactions) {
            const augs = ns.singularity.getAugmentationsFromFaction(faction)
                .filter(aug => !ownedAugs().includes(aug));

            for (const aug of augs) {
                const { hackSkillMult, hackExpMult } = extractHackingPower(aug);

                if (hackSkillMult > 0 || hackExpMult > 0) { // Only care about hacking boosts
                    const repNeeded = ns.singularity.getAugmentationRepReq(aug);
                    const currentRep = ns.singularity.getFactionRep(faction);

                    if (currentRep >= repNeeded) continue; // Already can buy it, no need to work


                    augTargets.push({
                        faction,
                        aug,
                        repNeeded,
                        currentRep,
                        hackSkillMult,
                        hackExpMult
                    });
                }
            }
        }

        if (augTargets.length === 0) return null;

        // Sort:
        // 1. Ascending by repNeeded
        augTargets.sort((a, b) => a.repNeeded - b.repNeeded);

        return augTargets[0];
    }

    function getBestCrime(): CrimeType {
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
    }

    while (true) {
        const target = findBestAugTarget();

        if (target) {
            if (lastTarget !== target.faction + target.aug) {
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
                    ns.tprint(`❌ Failed to start working for ${target.faction}`);
                }

                lastTarget = target.faction + target.aug;
            }
        } else {
            const crime = getBestCrime();
            if (lastTarget !== crime) {
                ns.tprint(`🔫 No faction work, committing ${crime}.`);
                ns.singularity.commitCrime(crime, false);
                lastTarget = crime;
            }
        }

        await ns.sleep(10_000);
    }
}
