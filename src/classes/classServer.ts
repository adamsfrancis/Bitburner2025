import { Server, NS } from "@ns";
import { serverConstants } from "/libraries/constants";

export class serverObject {
    ns:NS
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
    filesAvailable: string[];
    serverPath: string[];
    [key: string]: unknown;
    canFitWeaken: number;
    canFitGrow: number;
    canFitHack: number;

    constructor(ns: NS, data: Server, parentServer: string | undefined, serverPath: string[]) {

        this.ns =ns;
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
        this.ramAvailable = data.maxRam - data.ramUsed;
        this.parentServer = parentServer;
        this.filesAvailable = ns.ls(data.hostname);
        this.serverType = this.determineServerType(ns, data);
        this.isUsable = this.isServerUsable(data);
        this.serverPath = serverPath;
        this.canFitWeaken = this.calculateFit(data, serverConstants.ramCostWeaken);
        this.canFitGrow = this.calculateFit(data, serverConstants.ramCostGrow);
        this.canFitHack = this.calculateFit(data, serverConstants.ramCostHack);
    }

    private isServerUsable(data: Server): boolean {
        return (
            data.hasAdminRights ||
            data.hostname === "home" ||
            data.purchasedByPlayer
        );
    }

    private determineServerType(ns: NS, data: Server): string {
        if (data.hostname === "home") return "home";
        if (data.purchasedByPlayer) return "playerOwned";
        if (
            !data.hasAdminRights ||
            data.requiredHackingSkill! > ns.getHackingLevel() ||
            data.moneyMax === 0
        ) {
            return "non-Attackable";
        }
        return "targetServer";
    }
    private calculateFit(data: Server, ramCost: number): number {
        // If the server doesn't have admin rights, we can't use it
        if (!this.hasAdminRights) {
            return 0;
        }
    
        // Calculate the number of threads that fit into the available RAM based on the RAM cost
        const threadsAvail = Math.floor(data.maxRam / ramCost);
    
        return threadsAvail;
    }
    

    get isPrepped(): boolean {
        this.ns.print(`Checking to see if ${this.hostName} is prepped. secDef: ${this.hackDifficulty - this.minDifficulty} // moneyDiff: ${this.moneyMax - this.moneyAvailable}`)
        return ((this.hackDifficulty - this.minDifficulty) === 0 && (this.moneyMax - this.moneyAvailable) === 0);
    }
    get needsGrow(): boolean {
        return ((this.moneyMax - this.moneyAvailable) === 0);
    }
    get needsWeaken(): boolean {
        return ((this.hackDifficulty - this.minDifficulty) === 0);
    }
    set(newData: serverObject): void {
        Object.assign(this, newData);
    }
}