import { NS, Player, FactionWorkType, CrimeType } from "@ns";

export async function main(ns: NS) {
    while (true) {
        const playerInfo = ns.getPlayer();
        const ownedAugs = () => ns.singularity.getOwnedAugmentations(true);
        const allFactions = ns.singularity.checkFactionInvitations();

        // for (const faction of allFactions) {
        //     ns.singularity.joinFaction(faction);
        //     ns.tprint(`🧩 Joined faction: ${faction}`);
        // }

        const augs = getAugsByFaction(ns, playerInfo, ownedAugs());

        while (augs.length > 0) {
            const nextGoal = getBestAug(ns, playerInfo, augs);
            if (!nextGoal) break;

            const favor = ns.singularity.getFactionFavor(nextGoal.factionsLowestRep);
            if (favor >= 150) {
                ns.tprint(`⚠️ Skipping ${nextGoal.factionsLowestRep} (favor: ${favor} >= 150)`);
                augs.splice(augs.findIndex(a =>
                    a.augName === nextGoal.augName &&
                    a.factionsLowestRep === nextGoal.factionsLowestRep
                ), 1);
                continue;
            }

            ns.tprint(`🎯 Targeting ${nextGoal.augName} from ${nextGoal.factionsLowestRep} (need ${nextGoal.lowestRepRequirement})`);

            const bestWorkType = pickBestWorkType(ns, playerInfo, nextGoal.factionsLowestRep);

            if (!bestWorkType) {
                ns.tprint(`⚠️ No valid work types for ${nextGoal.factionsLowestRep}. Skipping.`);
                augs.splice(augs.findIndex(a =>
                    a.augName === nextGoal.augName &&
                    a.factionsLowestRep === nextGoal.factionsLowestRep
                ), 1);
                continue;
            }

            const worked = ns.singularity.workForFaction(nextGoal.factionsLowestRep, bestWorkType, false);
            if (!worked) {
                ns.tprint(`⚠️ ${nextGoal.factionsLowestRep} doesn't offer ${bestWorkType} work. Skipping.`);
                augs.splice(augs.findIndex(a =>
                    a.augName === nextGoal.augName &&
                    a.factionsLowestRep === nextGoal.factionsLowestRep
                ), 1);
                continue;
            }

            while (ns.singularity.getFactionRep(nextGoal.factionsLowestRep) < nextGoal.lowestRepRequirement) {
                await ns.sleep(10_000);
            }

            ns.tprint(`✅ Goal met for ${nextGoal.augName}. Moving on.`);
            augs.splice(augs.findIndex(a =>
                a.augName === nextGoal.augName &&
                a.factionsLowestRep === nextGoal.factionsLowestRep
            ), 1);
        }

        await doCrime(ns);
        await ns.sleep(1000);
    }
}


function getAugsByFaction(ns: NS, playerInfo: Player, owned: string[]): augmentObject[] {
    const results: augmentObject[] = [];

    for (const faction of playerInfo.factions) {
        const factionAugs = ns.singularity.getAugmentationsFromFaction(faction)
            .filter(a => !owned.includes(a));

        for (const aug of factionAugs) {
            const stats = ns.singularity.getAugmentationStats(aug);
            const prereqs = ns.singularity.getAugmentationPrereq(aug);
            const repReq = ns.singularity.getAugmentationRepReq(aug);

            const hackingScore = Math.sqrt((stats.hacking_exp ?? 1) * (stats.hacking ?? 1))
                + Math.sqrt((stats.hacking_chance ?? 1) * (stats.hacking_speed ?? 1))
                + Math.sqrt((stats.hacking_grow ?? 1) * (stats.hacking_money ?? 1));

            const charismaScore = Math.sqrt(stats.charisma_exp ?? 1) * (stats.charisma ?? 1);
            const combatScore = Math.sqrt((stats.strength ?? 1) * (stats.strength_exp ?? 1))
                + Math.sqrt((stats.defense ?? 1) * (stats.defense_exp ?? 1))
                + Math.sqrt((stats.dexterity ?? 1) * (stats.dexterity_exp ?? 1))
                + Math.sqrt((stats.agility ?? 1) * (stats.agility_exp ?? 1));

            if (hackingScore + charismaScore + combatScore === 0) continue;

            results.push({
                augName: aug,
                hackScore: hackingScore,
                combatScore: combatScore,
                charismaScore: charismaScore,
                basePrice: ns.singularity.getAugmentationBasePrice(aug),
                currentPrice: ns.singularity.getAugmentationPrice(aug),
                preRequisites: prereqs,
                factionsLowestRep: faction,
                lowestRepRequirement: repReq,
            });
        }
    }

    return results;
}

function getBestAug(ns: NS, player: Player, pool: augmentObject[]): augmentObject | null {
    const weights = {
        hack: 0.8,
        charisma: 1,
        combat: 0.4,
        repTimePenalty: 1.5, // Higher means time matters more
    };

    for (const aug of pool) {
        const workType = pickBestWorkType(ns, player, aug.factionsLowestRep);
        if (!workType) continue;

        const repGain = ns.formulas.work.factionGains(player, workType, ns.singularity.getFactionFavor(aug.factionsLowestRep)).reputation;
        if (repGain <= 0) continue;

        const timeToUnlock = aug.lowestRepRequirement / repGain;

        const hackBoost = (aug.hackScore / (player.skills.hacking + 1)) * weights.hack;
        const charismaBoost = (aug.charismaScore / (player.skills.charisma + 1)) * weights.charisma;
        const combatAvg = (player.skills.strength + player.skills.defense + player.skills.dexterity + player.skills.agility) / 4 + 1;
        const combatBoost = (aug.combatScore / combatAvg) * weights.combat;

        const timePenalty = weights.repTimePenalty * (1 / Math.sqrt(timeToUnlock)); // Inverse relationship

        aug["totalScore"] = (hackBoost + charismaBoost + combatBoost) * timePenalty;
    }

    pool.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
    return pool[0] ?? null;
}


function pickBestWorkType(ns: NS, player: Player, faction: string): FactionWorkType | null {
    const validTypes = ns.singularity.getFactionWorkTypes(faction);

    if (!validTypes || validTypes.length === 0) return null;

    const gains = validTypes.map(type => ({
        type,
        rep: ns.formulas.work.factionGains(player, type, ns.singularity.getFactionFavor(faction)).reputation
    }));

    gains.sort((a, b) => b.rep - a.rep);

    return gains[0].type;
}


type augmentObject = {
    augName: string,
    hackScore: number,
    combatScore: number,
    charismaScore: number,
    basePrice: number,
    currentPrice: number,
    preRequisites: string[],
    factionsLowestRep: string,
    lowestRepRequirement: number,
    totalScore?: number
};

const crimeTypes = ["Shoplift", "Rob Store", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassinate", "Heist"];


export async function doCrime(ns: NS) {
    ns.disableLog("ALL");
    const person = ns.getPlayer();

    const scoredCrimes = crimeTypes.map((crime) => {
        const stats = ns.singularity.getCrimeStats(crime as CrimeType);
        const successChance = ns.formulas.work.crimeSuccessChance(person, crime as CrimeType);
        const timeInSeconds = stats.time / 1000;

        const combatXP =
            stats.strength_exp +
            stats.defense_exp +
            stats.dexterity_exp +
            stats.agility_exp;

        const intelligenceXP = stats.intelligence_exp;
        const moneyScore = stats.money / 1_000; // Normalize

        const weightedScore =
            combatXP * 3 +
            intelligenceXP * 2 +
            moneyScore;

        const scorePerSecond = (weightedScore * successChance) / timeInSeconds;

        return {
            crime,
            scorePerSecond,
            successChance,
            time: stats.time,
            combatXP,
            intelligenceXP,
            money: stats.money,
        };
    }).sort((a, b) => b.scorePerSecond - a.scorePerSecond);

    const best = scoredCrimes[0];

    // Optional: Print breakdown for debugging
    for (const c of scoredCrimes) {
        ns.print(
            `${c.crime.padEnd(18)} | Score/s: ${c.scorePerSecond.toFixed(2)} | Chance: ${(c.successChance * 100).toFixed(1)}% | CombatXP: ${c.combatXP.toFixed(1)} | IntXP: ${c.intelligenceXP.toFixed(1)} | Money: ${ns.formatNumber(c.money)}`
        );
    }

    ns.print(`💡 Best crime selected: ${best.crime}`);
    await ns.singularity.commitCrime(best.crime as CrimeType, false);
    await ns.sleep(best.time + 1000);
}



