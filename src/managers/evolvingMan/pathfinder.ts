import { NS } from "@ns";
import { homeServer, serverConstants, evolvingManFiles } from "/libraries/constants";

async function findAllServers(ns: NS, start: string): Promise<string[]> {
  const visited = new Set<string>([start]);
  const queue: string[] = [start];

  while (queue.length > 0) {
    const host = queue.shift()!;
    const neighbors = ns.scan(host);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Ensure that every server returned is a valid hostname.
  return Array.from(visited).filter(hostname => ns.getServer(hostname));
}


async function prepServer(ns: NS, host: string): Promise<number> {
  let sleepTimer = 0;
  const maxMoney = ns.getServerMaxMoney(host);
  let currMoney = ns.getServerMoneyAvailable(host);

  // First, handle the grow operation if necessary
  if (currMoney < maxMoney * 0.99) {
    const growthMultiplier = maxMoney / Math.max(currMoney, 1);
    let growThreads = Math.ceil(ns.growthAnalyze(host, growthMultiplier));
    growThreads = Math.max(growThreads, 1);

    ns.tprint(`Growing ${host}: current $${currMoney}, target $${maxMoney}, threads: ${growThreads}`);
    await dispatchGrow(ns, growThreads, host);
    let growTime = ns.getGrowTime(host);
    sleepTimer = Math.max(sleepTimer, growTime); // Store the longest time
    currMoney = ns.getServerMoneyAvailable(host);
    ns.tprint(`Money on ${host} is now $${currMoney.toFixed(0)}`);
  }

  // Calculate the security increase after growth
  const initialSecurity = ns.getServerSecurityLevel(host);
  const minSecurity = ns.getServerMinSecurityLevel(host);
  const secDiff = initialSecurity - minSecurity;  // Before any grow

  // Then, handle the weaken operation if necessary
  const newSecurity = ns.getServerSecurityLevel(host); // After growth
  const secDiffAfterGrow = newSecurity - minSecurity; // Recalculate security diff after growth

  if (secDiffAfterGrow > 0.01) {
    const weakenThreads = Math.ceil(secDiffAfterGrow / 0.05);
    ns.tprint(`Weakening ${host} by ${secDiffAfterGrow.toFixed(2)} sec using ${weakenThreads} threads`);
    await dispatchWeaken(ns, weakenThreads, host);
    let weakenTime = ns.getWeakenTime(host);
    sleepTimer = Math.max(sleepTimer, weakenTime); // Store the longest time
    ns.tprint(`Security of ${host} is now ${ns.getServerSecurityLevel(host).toFixed(2)}`);
  }

  return sleepTimer;  // Return the total sleep time needed
}



async function dispatchGrow(ns: NS, threads: number, target: string) {
  for (const server of await getAvailableServers(ns)) {
    const maxThreads = Math.floor((server.maxRam - server.ramUsed) / serverConstants.ramCostGrow);
    const threadsToRun = Math.min(threads, maxThreads);

    if (threadsToRun > 0) {
      ns.exec("/managers/scripts/grow.js", server.hostname, threadsToRun, target, 0, false);
      threads -= threadsToRun;
      if (threads <= 0) break;
    }
  }
}

async function dispatchWeaken(ns: NS, threads: number, target: string) {
  for (const server of await getAvailableServers(ns)) {
    const maxThreads = Math.floor((server.maxRam - server.ramUsed) / serverConstants.ramCostWeaken);
    const threadsToRun = Math.min(threads, maxThreads);

    if (threadsToRun > 0) {
      ns.exec("/managers/scripts/weaken.js", server.hostname, threadsToRun, target, 0, false);
      threads -= threadsToRun;
      if (threads <= 0) break;
    }
  }
}


/** Main script to find, prep, and hack top servers */
export async function main(ns: NS): Promise<void> {

  while (true) {
    // Find all servers
    const allServers = await findAllServers(ns, serverConstants.homeServer);
    const playerHackLevel = ns.getHackingLevel();

    // Identify servers to crack based on their hacking level requirements
    // const toCrack = (await Promise.all(allServers.map(async (s) => {
    //   const server = await ns.getServer(s);
    //   return {
    //     host: s,
    //     server: server,
    //   };
    // })))
    //   .filter(({ server }) => server && !server.hasAdminRights && !server.purchasedByPlayer &&
    //     server.hostname !== serverConstants.homeServer && (server.requiredHackingSkill ?? 999999) <= ns.getHackingLevel())
    //   .sort((a, b) => (a.server.requiredHackingSkill ?? 999999) - (b.server.requiredHackingSkill ?? 999999))
    //   .map(({ host }) => host); // Extract just the server hostnames

    // // Write servers to crack into the sapper jobs file
    // if (toCrack.length > 0) {
    //   ns.write(evolvingManFiles.sapperJobs, JSON.stringify(toCrack), "w");
    // }
    // ns.exec("/managers/evolvingMan/sapper.js", serverConstants.homeServer, 1);

    // Identify hackable servers
    const hackableServers = allServers.filter((s) => {
      const server = ns.getServer(s);
      return server.hasAdminRights && server.moneyMax !== undefined && server.moneyMax > 0 &&
        server.requiredHackingSkill !== undefined && server.requiredHackingSkill <= playerHackLevel / 2;
    });

    // Sort hackable servers by money per hack time
    const scoredServers = hackableServers.map((host) => {
      const money = ns.getServerMaxMoney(host);
      const hackTime = ns.getHackTime(host);
      const score = money > 0 && hackTime > 0 ? money / hackTime : 0;
      return { host, score };
    });

    scoredServers.sort((a, b) => b.score - a.score);

    // Get the top 3 servers based on score
    const topTargets = scoredServers.slice(0, 1).map((entry) => entry.host);

    // Initialize the max sleep time
    let maxSleepTime = 0;

    // Prepping the servers
    for (const target of topTargets) {
      const sleepTimer = await prepServer(ns, target); // Get the sleep time for this target
      maxSleepTime = Math.max(maxSleepTime, sleepTimer); // Update max sleep time if necessary
    }

    ns.print(`Sleeping for: ${maxSleepTime / 1000} s`);
    await ns.sleep(maxSleepTime);

    // Now schedule HWGW operations for the top targets
    await scheduleHWGW(ns, topTargets[0]);

    await ns.sleep(1000)
  }

}




async function getAvailableServers(ns: NS) {
  const servers = await findAllServers(ns, homeServer);
  ns.print(`Found servers: ${servers.length}`);

  return servers
    .map(hostname => ns.getServer(hostname))
    .filter(server => server && server.hasAdminRights && server.maxRam - server.ramUsed > 2); // Ensure server is valid before accessing properties
}

async function calculateAvailableRAM(ns: NS): Promise<number> {
  const serverList = await getAvailableServers(ns);
  let availableRAM = 0;
  for (const server of serverList) {
    availableRAM += server.maxRam - server.ramUsed;
  }
  return availableRAM;
}

async function getMaxAvailableRam(ns: NS) {
  const availServers = await getAvailableServers(ns);
  return availServers
    .map(server => server.maxRam - server.ramUsed) // Calculate available RAM for each server
    .reduce((total, availableRam) => total + availableRam, 0); // Sum total available RAM across all servers
}

// Function to distribute threads across servers for HWGW batches
async function distributeThreads(ns: NS, target: string, batchDetails: {
  hackThreads: number,
  growThreads: number,
  weakenThreads1: number,
  weakenThreads2: number,
  hackDelay: number,
  growDelay: number,
  weakenDelay1: number,
  weakenDelay2: number
}) {
  const allServers = await getAvailableServers(ns);
  let remainingHackThreads = batchDetails.hackThreads;
  let remainingGrowThreads = batchDetails.growThreads;
  let remainingWeaken1Threads = batchDetails.weakenThreads1;
  let remainingWeaken2Threads = batchDetails.weakenThreads2;
  let hackDelay = batchDetails.hackDelay;
  let growDelay = batchDetails.growDelay;
  let weaken1Delay = batchDetails.weakenDelay1;
  let weaken2Delay = batchDetails.weakenDelay2;

  // Distribute threads for hacking, growing, and weakening across all available servers
  for (const server of allServers) {
    const availableRam = server.maxRam - server.ramUsed;

    if (remainingHackThreads > 0 && availableRam >= serverConstants.ramCostHack) {
      const hackThreadsOnServer = Math.min(Math.floor(availableRam / serverConstants.ramCostHack), remainingHackThreads);
      ns.exec("/managers/scripts/hack.js", server.hostname, hackThreadsOnServer, target, hackDelay, false);
      remainingHackThreads -= hackThreadsOnServer;
    }
    if (remainingWeaken1Threads > 0 && availableRam >= serverConstants.ramCostWeaken) {
      const weakenThreadsOnServer = Math.min(Math.floor(availableRam / serverConstants.ramCostWeaken), remainingWeaken1Threads);
      ns.exec("/managers/scripts/weaken.js", server.hostname, weakenThreadsOnServer, target, weaken1Delay, false);
      remainingWeaken1Threads -= weakenThreadsOnServer;
    }

    if (remainingGrowThreads > 0 && availableRam >= serverConstants.ramCostGrow) {
      const growThreadsOnServer = Math.min(Math.floor(availableRam / serverConstants.ramCostGrow), remainingGrowThreads);
      ns.exec("/managers/scripts/grow.js", server.hostname, growThreadsOnServer, target, growDelay, false);
      remainingGrowThreads -= growThreadsOnServer;
    }

    if (remainingWeaken2Threads > 0 && availableRam >= serverConstants.ramCostWeaken) {
      const weakenThreadsOnServer = Math.min(Math.floor(availableRam / serverConstants.ramCostWeaken), remainingWeaken2Threads);
      ns.exec("/managers/scripts/weaken.js", server.hostname, weakenThreadsOnServer, target, weaken2Delay, false);
      remainingWeaken2Threads -= weakenThreadsOnServer;
    }

    // Stop if we've distributed all threads
    if (remainingHackThreads <= 0 && remainingGrowThreads <= 0 && (remainingWeaken1Threads + remainingWeaken2Threads) <= 0) {
      break;
    }
  }

  // Report if there are leftover threads
  if (remainingHackThreads > 0 || remainingGrowThreads > 0 || (remainingWeaken1Threads + remainingWeaken2Threads) > 0) {
    ns.tprint(`Remaining threads for ${target}: hack: ${remainingHackThreads}, grow: ${remainingGrowThreads}, weaken: ${(remainingWeaken1Threads + remainingWeaken2Threads)}`);
  }
}

// Function to schedule and execute HWGW operations for the best server
async function scheduleHWGW(ns: NS, target: string) {
  const spacer = 100;
  let remainingRAM = await calculateAvailableRAM(ns); // Calculate total available RAM

  const hackTime = ns.getHackTime(target);
  const growTime = ns.getGrowTime(target);
  const weakenTime = ns.getWeakenTime(target);
  let batchSpacer = 0;

  // Calculate the initial delay for each phase of the operation
  let hackDelay = batchSpacer + weakenTime - spacer - hackTime;
  let weaken1Delay = batchSpacer + 0;
  let growDelay = batchSpacer + weakenTime + spacer - growTime;
  let weaken2Delay = batchSpacer + spacer * 2;

  let expectedEndTime = weaken2Delay;

  // Batch timings will accumulate to maintain a 10-minute window
  while (expectedEndTime < 600000 && remainingRAM > 0) {  // 10 minutes in ms
    const hackPercentSingleThread = ns.hackAnalyze(target);
    const hackThreads = Math.floor(serverConstants.hackAmountToSteal / hackPercentSingleThread);
    const percentStolen = hackThreads * hackPercentSingleThread;
    const growThreads = Math.ceil(ns.growthAnalyze(target, 1 / (1 - percentStolen)*1.2));
    const weakenThreads1 = Math.ceil((hackThreads * serverConstants.serverFortifyAmount) / serverConstants.serverWeakenAmount);
    const weakenThreads2 = Math.ceil((growThreads * serverConstants.serverFortifyAmount * 2) / serverConstants.serverWeakenAmount);

    // Calculate the total RAM required for the batch
    const totalRAMRequired = (hackThreads * serverConstants.ramCostHack) +
      (growThreads * serverConstants.ramCostGrow) +
      (weakenThreads1 * serverConstants.ramCostWeaken) +
      (weakenThreads2 * serverConstants.ramCostWeaken);

      let batchScheduled = false; 

    // Only proceed if there is enough available RAM
    if (remainingRAM >= totalRAMRequired) {
      // Schedule the batch
      await distributeThreads(ns, target, {
        hackThreads,
        growThreads,
        weakenThreads1,
        weakenThreads2,
        hackDelay,
        growDelay,
        weakenDelay1: weaken1Delay,
        weakenDelay2: weaken2Delay
      });

      // Increase the batchSpacer for the next batch
      batchSpacer += (spacer * 4);

      // Recalculate delays with the updated batchSpacer
      hackDelay = batchSpacer + weakenTime - spacer - hackTime;
      weaken1Delay = batchSpacer + 0;
      growDelay = batchSpacer + weakenTime + spacer - growTime;
      weaken2Delay = batchSpacer + spacer * 2;

      // Update the expected end time based on the new batchSpacer
      expectedEndTime = weaken2Delay;

      // Decrease available RAM
      remainingRAM -= totalRAMRequired;
    }

    if (!batchScheduled) {
      await ns.sleep(expectedEndTime);
    }

    // Sleep for a short time to let batches schedule
    await ns.sleep(100);
  }

  await ns.sleep(expectedEndTime);

}



