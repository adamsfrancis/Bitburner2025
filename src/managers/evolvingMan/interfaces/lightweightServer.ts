export interface lightweightServer {
    host: string;
    parent: string | undefined;
    path: string[]; // Path of server names from home to here
}