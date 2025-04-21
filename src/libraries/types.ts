export type toolsData = {
    Program:string;
    Command:string;
    portFlag:string;
    purchaseCost:number;
}

export type progressFlags = {
    allBruteSSH:boolean;
    allFTPCrack:boolean;
    allRelaySMTP:boolean;
    allHTTPWorm:boolean;
    allSQLInject:boolean;
    [key:string]:boolean
}

export type Batch = {
    target: string,
    threads: {
      hack: number,
      grow: number,
      weaken1: number,
      weaken2: number,
    },
    delays: {
      hack: number,
      grow: number,
      weaken1: number,
      weaken2: number,
    },
    totalRam: number
  }
  

export type ComparisonOperator = '===' | '<' | '<=' | '>' | '>=';