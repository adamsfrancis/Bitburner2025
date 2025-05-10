export const hackingTools: Record<string, { Program: string; Command: string; portFlag: string, purchaseCost: number }> = {
    ssh: { Program: 'BruteSSH.exe', Command: 'brutessh', portFlag: 'sshPortOpen', purchaseCost: 500000 },
    ftp: { Program: 'FTPCrack.exe', Command: 'ftpcrack', portFlag: 'ftpPortOpen', purchaseCost: 1500000 },
    smtp: { Program: 'relaySMTP.exe', Command: 'relaysmtp', portFlag: 'smtpPortOpen', purchaseCost: 5000000 },
    http: { Program: 'HTTPWorm.exe', Command: 'httpworm', portFlag: 'httpPortOpen', purchaseCost: 30000000 },
    sql: { Program: 'SQLInject.exe', Command: 'sqlinject', portFlag: 'sqlPortOpen', purchaseCost: 250000000 }
  };