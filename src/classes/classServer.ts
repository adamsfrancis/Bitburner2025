import { Server,NS } from "@ns";

export class serverObject{
    backdoorInstalled?: boolean;
    baseDifficulty?: number;
    cpuCores: number;
    ftpPortOpen: boolean;
    hackDifficulty: number;
    hasAdminRights: boolean;
    hostName: string;
    httpPortOpen: boolean;
    isConnectedTo: boolean;
    ramMax: number;
    minDifficulty: number;
    moneyAvailable: number;
    moneyMax: number;
    numOpenPortsRequired?: number;
    openPortCount?: number;
    purchasedByPlayer: boolean;
    ramUsed: number;
    requiredHackingSkill?: number;
    serverGrowth: number;
    smtpPortOpen: boolean;
    sqlPortOpen: boolean;
    sshPortOpen: boolean;
    parentServer?: string;
    ramAvailable: number;
    filesAvailable:string[];
    [key: string]: unknown;

    constructor(ns:NS,data:Server, parentServer: string | undefined) {
            
            this.backdoorInstalled = data.backdoorInstalled ?? false;
            this.baseDifficulty = data.baseDifficulty ?? 0;
            this.cpuCores = data.cpuCores;
            this.ftpPortOpen = data.ftpPortOpen;
            this.hackDifficulty = data.hackDifficulty ?? 999999; 
            this.hasAdminRights = data.hasAdminRights;
            this.hostName = data.hostname;
            this.httpPortOpen = data.httpPortOpen;
            this.isConnectedTo = data.isConnectedTo;
            this.ramMax = data.maxRam;
            this.minDifficulty = data.minDifficulty ?? 999999;
            this.moneyAvailable = data.moneyAvailable ?? -1;
            this.moneyMax = data.moneyMax ?? -1;
            this.numOpenPortsRequired = data.numOpenPortsRequired;
            this.openPortCount = data.openPortCount;
            this.purchasedByPlayer = data.purchasedByPlayer;
            this.ramUsed = data.ramUsed;
            this.requiredHackingSkill = data.requiredHackingSkill ?? 999999;
            this.serverGrowth = data.serverGrowth ?? -1;
            this.smtpPortOpen = data.smtpPortOpen;
            this.sqlPortOpen = data.sqlPortOpen;
            this.sshPortOpen = data.sshPortOpen;
            this.ramAvailable = data.maxRam-data.ramUsed;
            this.parentServer = parentServer;
            this.filesAvailable = ns.ls(data.hostname);      
    }
    public isPrepped(){
        return (this.hackDifficulty === this.minDifficulty && this.moneyAvailable === this.moneyMax);
    }
    public needsGrow(){
        return (this.moneyAvailable !== this.moneyMax);
    }
    public needsWeaken(){
        return (this.hackDifficulty !== this.minDifficulty);
    }
}