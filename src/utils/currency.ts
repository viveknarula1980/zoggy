import priceService from './priceService';

// Fallback price if service is unavailable
const FALLBACK_SOL_PRICE = 142.5;

export function usdToSol(usdAmount: number): number {
    const solPrice = priceService.getCachedSolPrice() || FALLBACK_SOL_PRICE;
    return usdAmount / solPrice;
}

export function solToUsd(solAmount: number): number {
    const solPrice = priceService.getCachedSolPrice() || FALLBACK_SOL_PRICE;
    return solAmount * solPrice;
}

export function formatUsd(amount: number, decimals: number = 2): string {
    return `$${amount.toFixed(decimals)}`;
}

export function formatSol(amount: number, decimals: number = 4): string {
    return `${amount.toFixed(decimals)} SOL`;
}

export function formatCurrencyDisplay(usdAmount: number, showSolEquivalent: boolean = true) {
    const solEquivalent = usdToSol(usdAmount);

    return {
        primary: formatUsd(usdAmount),
        secondary: showSolEquivalent ? formatSol(solEquivalent) : null,
        usdValue: usdAmount,
        solValue: solEquivalent,
    };
}

export function getSolPrice(): number {
    return priceService.getCachedSolPrice() || FALLBACK_SOL_PRICE;
}

export async function getSolPriceAsync(): Promise<number> {
    return await priceService.getSolPrice();
}

export function refreshSolPrice(): Promise<number> {
    return priceService.refreshPrice();
}
