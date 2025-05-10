import { NS } from "@ns";
import { homeServer } from "/globalConstants";

export async function main(ns: NS) {
    const cities = Object.values(ns.enums.CityName);
    const player = ns.getPlayer();

    for (const city of cities) {
        ns.singularity.travelToCity(city);
        ns.tprint(`🧳 Traveled to ${city}`);

        // Check for joinable factions after traveling
        const factions = ns.singularity.checkFactionInvitations();
        for (const faction of factions) {
            if (!player.factions.includes(faction)) {
                const joined = ns.singularity.joinFaction(faction);
                if (joined) {
                    ns.tprint(`✅ Joined faction: ${faction}`);
                }
            }
        }

        await ns.sleep(1000); // Give some time between hops
    }

}
