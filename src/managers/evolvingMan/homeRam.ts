import { NS } from "@ns";
export async function main(ns: NS) {
    while (true) {
      if (ns.getServerMoneyAvailable("home") > ns.singularity.getUpgradeHomeRamCost()) {
        ns.singularity.upgradeHomeRam();
      }
      await ns.sleep(10000); // Check every second
    }
  }