import { NS, Server } from "@ns";
import { evolvingManFiles } from "/libraries/constants";
const backdoorScript = "/managers/scripts/backdoor.js"

export async function main(ns: NS) {
    ns.ui.openTail();
    const sapperReport = await readSapperReport(ns);

    // Loop through the servers in the sapper report and attempt to crack and backdoor them
    for (const server of sapperReport) {
        const currentJob = new CrackingJob(ns, server);
        await currentJob.crackServer();
    }
}

// Function to read the server list from a file and return an array of server objects
export async function readSapperReport(ns: NS) {
    const serverMap: Server[] = [];
    const rawString = JSON.parse(ns.read(evolvingManFiles.sapperJobs));
    for (const server of rawString) {
        const curServer = await ns.getServer(server);
        serverMap.push(curServer);
    }
    return serverMap;
}

// CrackingJob class for managing cracking and backdoor processes
export class CrackingJob {
    private ns: NS;
    private server: Server;

    constructor(ns: NS, server: Server) {
        this.ns = ns;
        this.server = server;
    }

    // Method to crack the server if you have the necessary tools
    async crackServer() {
        if (!this.server.hasAdminRights) {
            const requiredPorts = this.ns.getServerNumPortsRequired(this.server.hostname);
            let availablePortOpeners = 0;
    
            if (this.ns.fileExists("BruteSSH.exe")) availablePortOpeners++;
            if (this.ns.fileExists("FTPcrack.exe")) availablePortOpeners++;
            if (this.ns.fileExists("relaySMTP.exe")) availablePortOpeners++;
            if (this.ns.fileExists("HTTPworm.exe")) availablePortOpeners++;
            if (this.ns.fileExists("SQLinject.exe")) availablePortOpeners++;
    
            if (availablePortOpeners < requiredPorts) {
                this.ns.tprint(`Not enough tools to crack ${this.server.hostname}. Need ${requiredPorts}, have ${availablePortOpeners}.`);
                return;
            }
    
            // Run available cracking programs
            if (this.ns.fileExists("BruteSSH.exe")) this.ns.brutessh(this.server.hostname);
            if (this.ns.fileExists("FTPcrack.exe")) this.ns.ftpcrack(this.server.hostname);
            if (this.ns.fileExists("relaySMTP.exe")) this.ns.relaysmtp(this.server.hostname);
            if (this.ns.fileExists("HTTPworm.exe")) this.ns.httpworm(this.server.hostname);
            if (this.ns.fileExists("SQLinject.exe")) this.ns.sqlinject(this.server.hostname);
    
            // Finally nuke the server
            this.ns.nuke(this.server.hostname);
            this.ns.tprint(`Successfully cracked ${this.server.hostname}.`);
        } else {
            this.ns.tprint(`${this.server.hostname} already has admin rights.`);
        }
    }

    // Method to backdoor the server if it's cracked
    async backdoorServer() {
        if (this.server.hasAdminRights && !this.server.backdoorInstalled && this.server.hostname !== "home") {
            this.ns.tprint(`Installing backdoor on ${this.server.hostname}...`);

            this.ns.tprint(`Backdoor installed on ${this.server.hostname}`);
        } else if (this.server.backdoorInstalled) {
            this.ns.tprint(`${this.server.hostname} already has a backdoor.`);
        } else {
            this.ns.tprint(`${this.server.hostname} is not cracked, cannot install backdoor.`);
        }
    }
}
