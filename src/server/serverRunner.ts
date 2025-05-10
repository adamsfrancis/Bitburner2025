import { NS } from "@ns";
import { main as updateAllServers } from "./updateAllServers";
import { main as crackAllServers } from "./crackAllServers";
import { main as scpAllFiles } from "../hacking/helpers/scpHackingScripts";

const SCRIPTS = [
    { name: "updateAllServers", fn: updateAllServers, path: "./updateAllServers.js" },
    { name: "crackAllServers", fn: crackAllServers, path: "./crackAllServers.js" },
    { name: "scpAllFiles", fn: scpAllFiles, path: "../hacking/helpers/scpHackingScripts.js" }
];

export async function main(ns: NS) {
    ns.disableLog("ALL");

    while (true) {
        for (const script of SCRIPTS) {
            while (true) {
                const ramNeeded = ns.getScriptRam(script.path);
                const availableRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");

                if (availableRam >= ramNeeded) {
                    const pid = ns.exec(script.path, "home");
                    if (pid !== 0) {
                        // Wait for script to finish
                        ns.print(`Ran: ${script.name}`)
                        while (ns.isRunning(pid)) {
                            await ns.sleep(100);
                        }
                        break;
                    }
                }

                await ns.sleep(500); // Wait and retry if RAM is not available
            }
        }

        await ns.sleep(1000); // Optional cooldown between full cycles
    }
}
