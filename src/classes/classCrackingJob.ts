import { NS } from "@ns";
import { Job } from "./classJob";
import { hackingTools } from "/libraries/constants";
import { serverObject } from "./classServer";

export class CrackingJob extends Job {
    constructor(ns: NS, server: serverObject) {
        super("Crack target", server.hostName);
        this.executeCrack(ns, server);
    }

    private async executeCrack(ns: NS, server: serverObject) {
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

        const portsRequired = ns.getServerNumPortsRequired(server.hostName);
        const availableTools = Object.values(hackingTools).filter(tool =>
            programsAvailable.includes(tool.Program)
        );

        for (const tool of availableTools) {
            const portOpen = portStatus.get(tool.portFlag) ?? false;
            if (!portOpen) {
                const command = ns[tool.Command as keyof NS] as (host: string) => void;
                command(server.hostName);
            }
        }

        if (availableTools.length >= portsRequired) {
            ns.nuke(server.hostName);
        } else {
        }
    }
}
