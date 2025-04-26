import { NS } from "@ns";
import { CrackingJob } from "/classes/classCrackingJob";
import { serverObject } from "/classes/classServer";
import { evolvingManFiles } from "/libraries/constants";

export async function main(ns: NS) {
    const sapperJobs = new Map<string,serverObject>
    const rawData = JSON.parse(await ns.read(evolvingManFiles.sapperJobs))

    for(const server of rawData){
        const curServer = new serverObject(ns,server,server.parent)
        sapperJobs.set(curServer.hostName,curServer)
    }

    for (const server of sapperJobs) {
        new CrackingJob(ns, server[1]);
    }
}
