
export const homeServer = 'home'

export const serverConstants = {
  /** These values taken from the game docs */
  maxRAMHome: 1073741824, // 2 ^ 30
  maxRAMPurchased: 1048576, // 2^20
  limitPurchasedServer: 25,
  serverGrowthRateBase: 1.03, // Unadjusted Growth rate
  serverGrowthRateMax: 1.0035, // Maximum possible growth rate (max rate accounting for server security)
  serverFortifyAmount: 0.002, // Amount by which server's security increases when its hacked/grown
  serverWeakenAmount: 0.05, // Amount by which server's security decreases when weakened
  costPerGBHome: 32000,
  costPerGBServer: 55000,
  /** my custom variables */
  minGBPurchasedServer: 8,
  nameRootPurchasedServer: "Fracas-",
  maxPercentageToSpendPerUpgrade: 0.1,
  ramCostGrow: 1.75,
  ramCostHack: 1.7,
  ramCostWeaken: 1.75,
  hackAmountToSteal: 0.01
}

export const hacknetConstants = {
  //seconds * minutes
  maxBreakEvenTime: 60 * 10
}

export const allBaseServers = ['home', 'n00dles', 'foodnstuff', 'zer0', 'CSEC', 'sigma-cosmetics', 'joesguns', 'hong-fang-tea', 'harakiri-sushi', 'nectar-net', 'neo-net', 'the-hub', 'zb-institute', 'lexo-corp', 'aevum-police', 'I.I.I.I', 'rho-construction', 'netlink', 'syscore', 'catalyst', 'crush-fitness', 'omega-net', 'max-hardware', 'silver-helix', 'phantasy', 'computek', 'rothman-uni', 'alpha-ent', 'summit-uni', 'millenium-fitness', 'galactic-cyber', 'aerocorp', 'omnia', 'defcomm', 'solaris', 'taiyang-digital', 'unitalife', 'icarus', 'zb-def', 'titan-labs', 'fulcrumtech', 'omnitek', 'univ-energy', 'zeus-med', 'infocomm', 'applied-energetics', 'stormtech', 'run4theh111z', 'vitalife', '4sigma', 'b-and-a', 'fulcrumassets', 'The-Cave', 'powerhouse-fitness', '.', 'blade', 'nwo', 'ecorp', 'megacorp', 'clarkinc', 'nova-med', 'microdyne', 'helios', 'kuai-gong', 'global-pharm', 'snap-fitness', 'deltaone', 'johnson-ortho', 'avmnite-02h', 'iron-gym', 'darkweb'];

export const hackingTools: Record<string, { Program: string; Command: string; portFlag: string, purchaseCost: number }> = {
  ssh: { Program: 'BruteSSH.exe', Command: 'brutessh', portFlag: 'sshPortOpen', purchaseCost: 500000 },
  ftp: { Program: 'FTPCrack.exe', Command: 'ftpcrack', portFlag: 'ftpPortOpen', purchaseCost: 1500000 },
  smtp: { Program: 'relaySMTP.exe', Command: 'relaysmtp', portFlag: 'smtpPortOpen', purchaseCost: 5000000 },
  http: { Program: 'HTTPWorm.exe', Command: 'httpworm', portFlag: 'httpPortOpen', purchaseCost: 30000000 },
  sql: { Program: 'SQLInject.exe', Command: 'sqlinject', portFlag: 'sqlPortOpen', purchaseCost: 250000000 }
};

export const globalFiles: Record<string, string> = {
  serverMap: '/files/serverMap.js',
  daemon: '/managers/daemon.js',
  serverManager: '/managers/serverManager.js'
}

export const filesToSCP = [
  '/managers/scripts/grow.js',
  '/managers/scripts/hack.js',
  '/managers/scripts/weaken.js'
]