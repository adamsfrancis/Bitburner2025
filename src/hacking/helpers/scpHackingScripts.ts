import { NS } from "@ns";
// @ts-ignore
import { allServers } from "/server/allServers.js";
import { hackingScripts } from "../constants";
import { homeServer } from "/globalConstants";

export async function main(ns: NS) {
    for (const server of allServers) {
        for (const [name, script] of Object.entries(hackingScripts)) {
            ns.scp(script, server, homeServer);
        }
    }
}