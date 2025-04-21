import { NS } from "@ns";

export function writeToFile(ns:NS,writeableObject:any,fileLocation:string){
    ns.write(fileLocation,writeableObject,"w")
}

export function stringifyJSONandWrite(ns:NS,writeableObject:any,fileLocation:string){
    ns.write(fileLocation,JSON.stringify(writeableObject),"w")
}

export async function readAndParseJSON<T = any>(ns: NS, fileLocation: string): Promise<T> {
    const raw = await ns.read(fileLocation);
    return JSON.parse(raw);
  }
  