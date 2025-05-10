import { NS, Server } from "@ns";
import { Job } from "./classJob";
import { hackingTools } from "/libraries/constants";

export class CrackingJob extends Job {
    constructor(ns: NS, server: Server) {
        super("Crack target", server.hostname);
        this.executeCrack(ns, server);
    }

    private async executeCrack(ns: NS, server: Server) {
        const programsAvailable = Object.values(hackingTools)
            .map(t => t.Program)
            .filter(p => ns.fileExists(p, "home"));

        const portStatus = new Map<string, boolean>([
            ["sshPortOpen", server.sshPortOpen],
            ["ftpPortOpen", server.ftpPortOpen],
            ["smtpPortOpen", server.smtpPortOpen],
            ["httpPortOpen", server.httpPortOpen],
            ["sqlPortOpen", server.sqlPortOpen]
        ]);

        const portsRequired = ns.getServerNumPortsRequired(server.hostname);
        const availableTools = Object.values(hackingTools).filter(tool =>
            programsAvailable.includes(tool.Program)
        );

        for (const tool of availableTools) {
            const portOpen = portStatus.get(tool.portFlag) ?? false;
            if (!portOpen) {
                const command = ns[tool.Command as keyof NS] as (host: string) => void;
                command(server.hostname);
            }
        }

        if (availableTools.length >= portsRequired) {
          const didNuke =  ns.nuke(server.hostname);
          if(didNuke){ns.exec("/managers/scripts.backdoor.js",server.hostname,1)}
        } 
    }
}
