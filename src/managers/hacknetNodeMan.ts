import { NS } from "@ns";
import { hacknetConstants } from "/libraries/constants";

export async function main(ns: NS) {
    while (true) {
      try {
        const numNodes = ns.hacknet.numNodes();
  
        if (numNodes === 0) {
          if (ns.getPlayer().money > ns.hacknet.getPurchaseNodeCost()) {
            ns.hacknet.purchaseNode();
            ns.print("Purchased initial node");
          }
          await ns.sleep(200);
          continue;
        }
  
        const playerMoney = ns.getPlayer().money;
  
        type UpgradeOption = {
          node: number;
          stat: "level" | "ram" | "cores";
          cost: number;
          roi: number; // seconds to break even
        };
  
        const upgrades: UpgradeOption[] = [];
  
        for (let i = 0; i < numNodes; i++) {
          const stats = ns.hacknet.getNodeStats(i);
  
          // LEVEL
          const levelCost = ns.hacknet.getLevelUpgradeCost(i, 1);
          const levelGain = stats.production / stats.level;
          if (levelCost < Infinity && levelGain > 0) {
            upgrades.push({
              node: i,
              stat: "level",
              cost: levelCost,
              roi: levelCost / levelGain,
            });
          }
  
          // RAM
          const ramCost = ns.hacknet.getRamUpgradeCost(i, 1);
          const ramGain = stats.production; // approx doubling effect
          if (ramCost < Infinity && ramGain > 0) {
            upgrades.push({
              node: i,
              stat: "ram",
              cost: ramCost,
              roi: ramCost / ramGain,
            });
          }
  
          // CORES
          const coreCost = ns.hacknet.getCoreUpgradeCost(i, 1);
          const coreGain = stats.production / (stats.cores + 5);
          if (coreCost < Infinity && coreGain > 0) {
            upgrades.push({
              node: i,
              stat: "cores",
              cost: coreCost,
              roi: coreCost / coreGain,
            });
          }
        }
  
        // New node (use average production for ROI estimate)
        const newNodeCost = ns.hacknet.getPurchaseNodeCost();
        const avgProd = ns.hacknet.getNodeStats(0).production || 1;
        if (newNodeCost < Infinity) {
          upgrades.push({
            node: -1,
            stat: "level",
            cost: newNodeCost,
            roi: newNodeCost / avgProd,
          });
        }
  
        upgrades.sort((a, b) => a.roi - b.roi);
  
        const best = upgrades[0];
        if (best && best.cost <= playerMoney && best.roi <= hacknetConstants.maxBreakEvenTime) {
          if (best.node === -1) {
            ns.hacknet.purchaseNode();
            ns.print("Purchased new node");
          } else {
            switch (best.stat) {
              case "level":
                await ns.hacknet.upgradeLevel(best.node, 1);
                ns.print(`Upgraded level of node ${best.node}`);
                break;
              case "ram":
                await ns.hacknet.upgradeRam(best.node, 1);
                ns.print(`Upgraded RAM of node ${best.node}`);
                break;
              case "cores":
                await ns.hacknet.upgradeCore(best.node, 1);
                ns.print(`Upgraded cores of node ${best.node}`);
                break;
            }
          }
        }
  
      } catch (err) {
        ns.print(`ERROR: ${err}`);
      }
  
      await ns.sleep(200);
    }
  }