import { NS } from "@ns";

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    const STOCKS_TO_TRACK = ns.stock.getSymbols();

    // Initialize total profit/loss
    let totalProfitLoss = 0;

    // Sell all stocks and calculate profit/loss
    for (const symbol of STOCKS_TO_TRACK) {
        const [shares, avgCost] = ns.stock.getPosition(symbol);
        
        if (shares > 0) {
            const currentPrice = ns.stock.getPrice(symbol);
            const profitLoss = (currentPrice - avgCost) * shares;
            totalProfitLoss += profitLoss;

            ns.stock.sellStock(symbol, shares);
            ns.tprint(`✅ Sold ${shares} shares of ${symbol} | Profit/Loss: ${profitLoss.toFixed(2)}`);
        } else {
            ns.tprint(`❌ No shares to sell for ${symbol}`);
        }
    }

    // Print final total profit/loss
    ns.tprint(`🤑 Final Profit/Loss across all stocks: ${totalProfitLoss.toFixed(2)}`);

    // Optional: Confirm all stocks are sold
    ns.tprint(`🛑 All stocks sold.`);
}
