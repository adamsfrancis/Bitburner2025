import { NS } from "@ns";
import { allFactions } from "/globalConstants";

export async function main(ns: NS) {
    for (const faction of allFactions) {
        const reqs = ns.singularity.getFactionInviteRequirements(faction);
        ns.tprint(`\n=== ${faction} ===`);

        const lines = reqs.map(r => parseRequirement(r));
        for (const line of lines.flat()) {
            ns.tprint(`- ${line}`);
        }
    }
}

function parseRequirement(req: any): string[] {
    switch (req.type) {
        case "city": return [`Be in ${req.city}`];
        case "money": return [`Have at least \$${req.money.toLocaleString()}`];
        case "karma": return [`Karma ≤ ${req.karma}`];
        case "numPeopleKilled": return [`Have killed at least ${req.numPeopleKilled} people`];
        case "skills": return Object.entries(req.skills).map(([skill, level]) =>
            `Have ${skill} ≥ ${level}`
        );
        case "employedBy": return [`Be employed at ${req.company}`];
        case "jobTitle": return [`Hold the job title "${req.jobTitle}"`];
        case "location": return [`Be at ${req.location}`];
        case "hacknetRAM": return [`Hacknet nodes must have at least ${req.hacknetRAM} GB RAM`];
        case "hacknetCores": return [`Hacknet nodes must have at least ${req.hacknetCores} cores`];
        case "hacknetLevels": return [`Hacknet nodes must have at least ${req.hacknetLevels} levels`];
        case "numAugmentations": return [`Have ${req.numAugmentations} augmentations`];
        case "bitNodeN": return [`Be in BitNode-${req.bitNodeN}`];
        case "sourceFile": return [`Have Source-File ${req.sourceFile}`];
        case "bladeburnerRank": return [`Bladeburner rank ≥ ${req.bladeburnerRank}`];
        case "not": return parseRequirement(req.condition).map(line => `NOT: ${line}`);
        case "someCondition":
            const orLines = req.conditions.flatMap(parseRequirement);
            return [`One of the following must be true:`].concat(
                orLines.map((line: string) => `  • ${line}`)
            );
        default: return [`[Unknown requirement type: ${req.type}]`];
    }
}
