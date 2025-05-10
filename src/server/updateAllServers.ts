import { NS } from "@ns";
import { getServerStructure } from "./getServerMap";

export async function main(ns: NS) {
    const serverList: string[] = await getServerStructure(ns);
    
    const constPrefix = "export const allServers = ";
    const arrayString = JSON.stringify(serverList);

    const output = constPrefix + arrayString + ";";

    ns.write("/server/allServers.js",output,"w");
}
