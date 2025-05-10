import { NS, Server } from "@ns";
// @ts-ignore
import { allServers } from "/server/allServers.js";
import { homeServer } from "/globalConstants";

export function getTargetsRanked(ns: NS): string[] {
    const playerHackingLevel = ns.getHackingLevel();
    const serverList: string[] = allServers;
    const serverObjectList:Server[] = []


    //Fill serverObjectList
    for(const server of serverList){
        serverObjectList.push(ns.getServer(server));
    }

    //Simulate max weaken
    for(const server of serverObjectList){
        server.moneyAvailable = server.moneyMax;
        server.hackDifficulty = server.minDifficulty;
    }

    const possibleTargets = serverObjectList.filter(s => isValidTarget(ns, s, playerHackingLevel));

    const rankedTargets = possibleTargets
        .map(server => [server, getProfitPerHack(ns, server)] as [Server, number])
        .sort((a, b) => b[1] - a[1]).map(s => s[0].hostname); // descending order
    return rankedTargets;
}

function isValidTarget(ns:NS,server:Server,playerLevel:number){
    if(!server.hasAdminRights){ return false;}
    if(server.moneyMax === undefined){ return false;}
    if(server.moneyMax <= 0){ return false;}
    if(server.requiredHackingSkill === undefined){ return false;}
    if(server.requiredHackingSkill > playerLevel){ return false;}
    if(server.hostname === homeServer){ return false;}

    return true;
}

function getProfitPerHack(ns:NS,server:Server){
    const playerInfo = ns.getPlayer()
    const weakenTime = ns.formulas.hacking.weakenTime(server,playerInfo);
    const hackPercent = ns.formulas.hacking.hackPercent(server,playerInfo)
    const moneyPerHack = server.moneyMax! * hackPercent;
    return moneyPerHack/weakenTime;
}