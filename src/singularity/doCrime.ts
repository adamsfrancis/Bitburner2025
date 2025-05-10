import { CrimeType, NS } from "@ns";

const crimeTypes = ["Shoplift", "Rob Store", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassinate", "Heist"];


export async function main(ns: NS) {
    const flags = ns.flags([
      ["int", false],
      ["combat", false],
      ["money", false],
    ]);
  while(true){
    const person = ns.getPlayer();
  
    const scoredCrimes = crimeTypes.map((crime) => {
      const stats = ns.singularity.getCrimeStats(crime as CrimeType);
      const successChance = ns.formulas.work.crimeSuccessChance(person, crime as CrimeType);
      const timeInSeconds = stats.time / 1000;
  
      const weightedScore =
        (flags.int ? stats.intelligence_exp : 0) +
        (flags.combat
          ? stats.strength_exp + stats.defense_exp + stats.dexterity_exp + stats.agility_exp
          : 0) +
        (flags.money ? stats.money / 1_000 : 0); // Normalize money
  
      const scorePerSecond = (weightedScore * successChance) / timeInSeconds;
  
      return {
        crime,
        scorePerSecond,
        successChance,
        time: stats.time,
      };
    }).sort((a, b) => b.scorePerSecond - a.scorePerSecond);
  
    const best = scoredCrimes[0];
  
    while (true) {
      const success = await ns.singularity.commitCrime(best.crime as CrimeType, false);
      if (!success) {
        ns.tprint(`Failed to commit ${best.crime}`);
        await ns.sleep(1000);
      } else {
        await ns.sleep(best.time + 50);
      }
    }
    await ns.sleep(1000)
  }
  }
