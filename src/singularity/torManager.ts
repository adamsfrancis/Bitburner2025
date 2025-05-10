import { NS } from "@ns";
import { homeServer } from "/globalConstants";

export async function main(ns: NS) {
    while (true) {
        const currentFunds = ns.getPlayer().money;

        // Step 1: Ensure TOR
        if (!ns.hasTorRouter()) {
            if (currentFunds >= 200_000) {
                ns.singularity.purchaseTor();
            }
            await ns.sleep(10_000);
            continue;
        }

        // Step 2: Only consider programs not already owned
        const availablePrograms = ns.singularity
            .getDarkwebPrograms()
            .filter((prog) => !ns.fileExists(prog, homeServer));

        // Step 3: Try to purchase any affordable programs
        for (const prog of availablePrograms) {
            const cost = ns.singularity.getDarkwebProgramCost(prog);
            if (cost <= currentFunds) {
                const purchased = ns.singularity.purchaseProgram(prog);
                if (purchased) {
                    ns.tprint(`💾 Purchased ${prog} for ${ns.formatNumber(cost)}`);
                }
            }
        }

        // ✅ Exit if nothing left to buy
        if (availablePrograms.length === 0) {
            ns.tprint("✅ All Darkweb programs purchased.");
            break;
        }

        await ns.sleep(10_000);
    }
}
