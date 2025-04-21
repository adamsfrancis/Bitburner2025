import { NS } from "@ns";

export class hackingTool {
    Program: string;
    Command: string;
    portFlag: string;
    purchasedTool: boolean;
    purchaseCost: number;

    constructor(ns: NS, data: any) {
        this.Program = data.Program;
        this.Command = data.Command;
        this.portFlag = data.portFlag;
        this.purchasedTool = data.purchasedTool ?? false;
        this.purchaseCost = data.purchaseCost;
    }

    public updateStatus(ns: NS) {
        this.purchasedTool = ns.fileExists(this.Program, "home");
    }
}
