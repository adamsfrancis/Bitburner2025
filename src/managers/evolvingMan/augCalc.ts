import { NS } from "@ns";

export async function main(ns: NS) {
    const factions = ns.getPlayer().factions;
    const allAugments = {};
  
    for (const faction of factions) {
      allAugments[faction] = ns.singularity.getAugmentationsFromFaction(faction)
        .filter(aug => {
          const cost = ns.singularity.getAugmentationPrice(aug);
          const repReq = ns.singularity.getAugmentationRepReq(aug);
          return ns.getServerMoneyAvailable("home") >= cost && ns.singularity.getFactionRep(faction) >= repReq;
        });
    }
  
    const availableAugments = Object.entries(allAugments)
      .flatMap(([faction, augs]) => augs.map(aug => ({ faction, aug })))
      .filter(({ aug }) => !ns.singularity.getOwnedAugmentations(true).includes(aug));
  
    const totalAvailable = availableAugments.length;
    const money = ns.getServerMoneyAvailable("home");
    const incomeRate = estimateIncomeRate(ns);
    const favorReadyFactions = factions.filter(f => ns.singularity.getFactionFavor(f) >= 150);
  
    ns.tprint("\n=== INSTALLATION ANALYSIS ===");
    ns.tprint(`Available augments to buy: ${totalAvailable}`);
    ns.tprint(`Home money: ${ns.formatNumber(money)} | Income rate: ${ns.formatNumber(incomeRate)}/s`);
    ns.tprint(`Factions with donations unlocked: ${favorReadyFactions.join(", ") || "None"}`);
  
    const upcomingFactions = checkUpcomingFactions(ns);
  
    if (upcomingFactions.length > 0) {
      ns.tprint(`Potential major factions coming soon: ${upcomingFactions.join(", ")}`);
    }
  
    const recommendation = makeRecommendation(ns, totalAvailable, upcomingFactions, favorReadyFactions);
  
    ns.tprint(`\nRecommendation: ${recommendation}\n`);
  }
  
  /** Estimate how much money you're making per second */
  function estimateIncomeRate(ns: NS): number {
    // Simple guess based on hacknet, hacking income, etc.
    // (could get fancier later)
    const hacknetProd = ns.getHacknetMultipliers().production;
    return hacknetProd * 1e6; // Ballpark, adjust if needed
  }
  
  /** Check for factions you are close to unlocking */
  function checkUpcomingFactions(ns: NS): string[] {
    const upcoming = [];
  
    // Example logic (expandable)
    if (!ns.getPlayer().factions.includes("Daedalus") && ns.getPlayer().money > 1e9) {
      upcoming.push("Daedalus");
    }
    if (!ns.getPlayer().factions.includes("Illuminati") && ns.getPlayer().skills.hacking > 1500) {
      upcoming.push("Illuminati");
    }
  
    return upcoming;
  }
  
  /** Core logic to decide whether to install */
  function makeRecommendation(ns: NS, totalAvailable: number, upcomingFactions: string[], favorReadyFactions: string[]): string {
    if (upcomingFactions.length > 0) {
      return "Wait - major factions are close.";
    }
    if (totalAvailable >= 10) {
      return "Install - you have a solid batch of augments.";
    }
    if (favorReadyFactions.length > 0) {
      return "Consider donating to factions and buying more augments first.";
    }
    if (totalAvailable <= 3) {
      return "Wait - not enough augments worth installing yet.";
    }
    return "Optional - up to you based on goals.";
  }
  