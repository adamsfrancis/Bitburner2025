import { NS } from "@ns";

/** @inputs targetServer, additionalDelay (ms), stock (false), threads (1) */
export async function main(ns: NS) {
    const targetServer = ns.args[0] as string;
    const additionalDelay = ns.args[1] as number;
    const stock = ns.args[2] as boolean;
    const threads = ns.args[3] as number;

    //ns.tprint(`📦 Args: targetServer=${targetServer}, delay=${additionalDelay}, stock=${stock}, threads=${threads}`);

    if (!targetServer || isNaN(additionalDelay) || typeof stock !== "boolean" || threads < 1) {
        ns.tprint("❌ Invalid arguments. Skipping grow.");
        return;
    }
    

    await ns.grow(targetServer, { additionalMsec: additionalDelay, stock, threads });
}
