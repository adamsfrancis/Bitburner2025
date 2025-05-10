import { NS } from "@ns";

/** @inputs targetServer, additionalMsec (number), stock (boolean), threads (number) */
export async function main(ns: NS) {
    const target = ns.args[0] as string;
    const additionalMsec = Number(ns.args[1]);
    const stock = ns.args[2] as boolean;
    const threads = Number(ns.args[3]);

    const options = { additionalMsec, stock, threads };
    await ns.hack(target, options);
}
