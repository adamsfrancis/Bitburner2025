import { NS } from "@ns";
// @ts-ignore
import { allServers } from "/server/allServers.js";
import { hackingTools } from "./serverConstants";
import { homeServer } from "/globalConstants";

export async function main(ns: NS) {
    const toolCount = getToolCount(ns);
    const purchasedServers = ns.getPurchasedServers();
    const serverList: string[] = allServers;

    const filteredServers = serverList.filter(s =>
        !ns.hasRootAccess(s) &&
        ns.getServerNumPortsRequired(s) <= toolCount &&
        !purchasedServers.includes(s) &&
        s !== homeServer
    );
    for (const server of filteredServers) {
        if (ns.fileExists("BruteSSH.exe")) ns.brutessh(server);
        if (ns.fileExists("FTPCrack.exe")) ns.ftpcrack(server);
        if (ns.fileExists("relaySMTP.exe")) ns.relaysmtp(server);
        if (ns.fileExists("HTTPWorm.exe")) ns.httpworm(server);
        if (ns.fileExists("SQLInject.exe")) ns.sqlinject(server);
        ns.nuke(server);
    }

}

function getToolCount(ns: NS) {
    let toolCount = 0;
    for (const tool of Object.entries(hackingTools)) {
        if (ns.fileExists(tool[1].Program)) { toolCount++; }
    }
    return toolCount;
}
