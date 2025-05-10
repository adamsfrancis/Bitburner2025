import { NS } from "@ns";
import { serverConstants } from "/libraries/constants";
import { hackingScripts } from "/hacking/constants";

export async function main(ns: NS) {
    ns.disableLog("ALL")
    const COST_PER_GB = serverConstants.costPerGBServer;
    const MIN_RAM_GB = serverConstants.minGBPurchasedServer;
    const MAX_SPEND_PERCENT = serverConstants.maxPercentageToSpendPerUpgrade;
    const MAX_SERVERS = ns.getPurchasedServerLimit();
    const SERVER_NAME_PREFIX = serverConstants.nameRootPurchasedServer;
while(true){
    let availableMoney = ns.getServerMoneyAvailable("home");
    const maxSpend = availableMoney * MAX_SPEND_PERCENT;

    const purchasedServers = ns.getPurchasedServers()
        .filter(hostname => hostname !== "home")
        .map(hostname => ({ hostName: hostname, ramMax: ns.getServerMaxRam(hostname) }));

    // Purchase new servers if we haven't hit the limit
    while (purchasedServers.length < MAX_SERVERS && MIN_RAM_GB * COST_PER_GB <= maxSpend) {
        const newName = SERVER_NAME_PREFIX + purchasedServers.length;
        const cost = MIN_RAM_GB * COST_PER_GB;

        const hostname = ns.purchaseServer(newName, MIN_RAM_GB);
        if (hostname) {
            availableMoney -= cost;
            purchasedServers.push({ hostName: hostname, ramMax: MIN_RAM_GB });
        } else {
            break;
        }
    }

    // Sort existing servers by RAM to upgrade weakest first
    const sortedServers = purchasedServers.sort((a, b) => a.ramMax - b.ramMax);

    for (const server of sortedServers) {
        await scpIfNeeded(ns,server.hostName)
        const newRam = server.ramMax * 2;
        const upgradeCost = newRam * COST_PER_GB;

        if (upgradeCost <= availableMoney * MAX_SPEND_PERCENT) {
            const success = ns.upgradePurchasedServer(server.hostName, newRam);
            if (success) {
                availableMoney -= upgradeCost;
                server.ramMax = newRam;
                ns.print(`Upgraded ${server.hostName} to ${newRam}GB.`)
            } else {
                break;
            }
        } else {
            break;
        }
    }
    await ns.sleep(10000)
}
}
async function scpIfNeeded(ns:NS,server:string){
    for(const [,file] of Object.entries(hackingScripts)){
        if(!ns.fileExists(file,server)){
            await ns.scp(file,server,serverConstants.homeServer)
        }
    }

}
