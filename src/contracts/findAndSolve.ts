import { solvers } from "./solvers";
import { CodingContract, NS } from "@ns";
// @ts-ignore
import { allServers } from "/server/allServers.js";

export async function main(ns: NS) {
    ns.disableLog("scan");
    ns.disableLog("sleep");

    // Run contracts every minute
    while (true) {
        await attemptAllContracts(ns);
        await ns.sleep(60 * 1000);
    }
}

export async function attemptAllContracts(ns: NS) {
    const contracts = getContracts(ns);
    ns.print(`Found ${contracts.length} contracts.`);

    // Attempt each contract
    for (const contract of contracts) {
        await attemptContract(ns, contract);
    }
}

export function getContracts(ns: NS) {
    const contracts: { host: string, file: string, type: string, triesRemaining: number }[] = [];

    // Scan all hosts for contracts
    for (const host of allServers) {
        const files = ns.ls(host);
        for (const file of files) {
            if (file.endsWith(".cct")) {
                const contract = {
                    host,
                    file,
                    type: ns.codingcontract.getContractType(file, host),
                    triesRemaining: ns.codingcontract.getNumTriesRemaining(file, host),
                };
                contracts.push(contract);
            }
        }
    }
    return contracts;
}

export async function attemptContract(ns: NS, contract: {host:string,file:string,type:string,triesRemaining:number}) {
    const solver = solvers[contract.type];

    if (solver) {
        ns.print(`Attempting to solve contract: ${JSON.stringify(contract, null, 2)}`);
        const data = ns.codingcontract.getData(contract.file, contract.host);

        try {
            // Run the solver in a web worker
            const solution = await runInWebWorker(solver, [data]);
            const reward = ns.codingcontract.attempt(solution, contract.file, contract.host);

            if (reward) {
                ns.tprint(`${reward} for solving "${contract.type}" on ${contract.host}`);
                ns.print(`${reward} for solving "${contract.type}" on ${contract.host}`);
            } else {
                ns.tprint(`ERROR: Failed to solve "${contract.type}" on ${contract.host}`);
                delete solvers[contract.type];  // Remove the solver if it fails
            }
        } catch (error) {
            ns.print(`ERROR solving ${contract.type}: ${error}`);
        }
    } else {
        ns.print(`WARNING: No solver available for contract "${contract.type}" on ${contract.host}`);
    }
}

async function runInWebWorker(fn: Function, args: any[], maxMs = 1000): Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = makeWorker(fn, resolve);

        // Set timeout to reject if it takes too long
        setTimeout(() => {
            reject(`${maxMs} ms elapsed.`);
            worker.terminate();
        }, maxMs);

        worker.postMessage(args);
    });
}

function makeWorker(workerFunction: Function, cb: (result: any) => void) {
    const workerSrc = `
    handler = (${workerFunction});
    onmessage = (e) => {
        result = handler.apply(this, e.data);
        postMessage(result);
    };`;

    const workerBlob = new Blob([workerSrc], { type: 'application/javascript' });
    const workerBlobURL = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerBlobURL);

    worker.onmessage = (e) => {
        cb(e.data);
    };

    return worker;
}
