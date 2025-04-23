import { NS } from "@ns";

interface StockData {
    minPrice: number;
    maxPrice: number;
    totalPrice: number;
    count: number;
    averagePrice: number;
    timeObserved: number;
    boughtShares: number;
    boughtPrice: number;
    totalProfitLoss: number;
}

export async function main(ns: NS): Promise<void> {
    const TICK_INTERVAL = 6000;
    const OBSERVE_MIN_MS = 600_000;
    const BUY_LIMIT_PERCENT = 0.10;
    const REQUIRED_PROFIT_MARGIN = 1_200_000;

    ns.disableLog("ALL");
    ns.clearLog();

    const stockDataMap = new Map<string, StockData>();
    const symbols = ns.stock.getSymbols();

    for (const symbol of symbols) {
        stockDataMap.set(symbol, {
            minPrice: Number.MAX_VALUE,
            maxPrice: 0,
            totalPrice: 0,
            count: 0,
            averagePrice: 0,
            timeObserved: 0,
            boughtShares: 0,
            boughtPrice: 0,
            totalProfitLoss: 0,
        });
    }

    while (true) {
        let totalProfitLoss = 0;
        let lines: string[] = [];

        for (const symbol of symbols) {
            const price = ns.stock.getPrice(symbol);
            const pos = ns.stock.getPosition(symbol);
            const sharesHeld = pos[0];

            const data = stockDataMap.get(symbol)!;

            // Update stats
            data.minPrice = Math.min(data.minPrice, price);
            data.maxPrice = Math.max(data.maxPrice, price);
            data.totalPrice += price;
            data.count++;
            data.averagePrice = data.totalPrice / data.count;
            data.timeObserved += TICK_INTERVAL;

            let status = "👀 Watching";
            const buyThreshold = data.minPrice * 1.1;
            const sellThreshold = data.maxPrice * 0.9;

            // BUY
            if (sharesHeld === 0 && data.timeObserved >= OBSERVE_MIN_MS && price <= buyThreshold) {
                const maxSpend = ns.getPlayer().money * BUY_LIMIT_PERCENT;
                const sharesToBuy = Math.floor(maxSpend / price);
                const maxShares = ns.stock.getMaxShares(symbol);
                const finalShares = Math.min(sharesToBuy, maxShares);

                if (finalShares > 0) {
                    ns.stock.buyStock(symbol, finalShares);
                    data.boughtShares = finalShares;
                    data.boughtPrice = price;
                    status = `🟢 Bought ${finalShares}`;
                }
            }

            // SELL
            if (sharesHeld > 0 && price >= sellThreshold) {
                const expectedProfit = (price - data.boughtPrice) * sharesHeld - 200_000;
                if (expectedProfit >= 1_000_000) {
                    ns.stock.sellStock(symbol, sharesHeld);
                    data.totalProfitLoss += expectedProfit;
                    data.boughtShares = 0;
                    status = `🔴 Sold ${sharesHeld}`;
                } else {
                    status = `💤 Holding (${sharesHeld})`;
                }
            }

            // Display line
            const profitDisplay = data.totalProfitLoss.toFixed(0).padStart(8, " ");
            lines.push(`${symbol.padEnd(5)} | Price: $${price.toFixed(2).padStart(8)} | Avg: $${data.averagePrice.toFixed(2).padStart(8)} | Min: $${data.minPrice.toFixed(2)} | Max: $${data.maxPrice.toFixed(2)} | P/L: $${profitDisplay} | ${status}`);

            totalProfitLoss += data.totalProfitLoss;
        }

        ns.clearLog();
        ns.print(`📊 Bitburner StockMan Dashboard`);
        ns.print(`Tick: ${new Date().toLocaleTimeString()} | Total Profit/Loss: $${totalProfitLoss.toFixed(2)}`);
        ns.print("-".repeat(100));
        lines.forEach(line => ns.print(line));

        await ns.sleep(TICK_INTERVAL);
    }
}
