/**
 * Real-time cryptocurrency price fetching service
 */

interface PriceData {
    price: number;
    lastUpdated: number;
    source: string;
}

interface CoinGeckoResponse {
    solana: {
        usd: number;
    };
}

class PriceService {
    private static instance: PriceService;
    private solPrice: PriceData | null = null;
    private updateInterval: NodeJS.Timeout | null = null;
    private listeners: ((price: number) => void)[] = [];
    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    private readonly UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    private readonly FALLBACK_PRICE = 142.5; // Fallback price if API fails

    private constructor() {
        this.startPriceUpdates();
    }

    public static getInstance(): PriceService {
        if (!PriceService.instance) {
            PriceService.instance = new PriceService();
        }
        return PriceService.instance;
    }

    /**
     * Get current SOL price in USD
     */
    public async getSolPrice(): Promise<number> {
        // Return cached price if still valid
        if (this.solPrice && this.isCacheValid()) {
            return this.solPrice.price;
        }

        try {
            const price = await this.fetchSolPrice();
            this.solPrice = {
                price,
                lastUpdated: Date.now(),
                source: 'coingecko'
            };
            this.notifyListeners(price);
            return price;
        } catch (error) {
            console.warn('Failed to fetch SOL price, using fallback:', error);
            return this.solPrice?.price || this.FALLBACK_PRICE;
        }
    }

    /**
     * Get cached SOL price (synchronous)
     */
    public getCachedSolPrice(): number {
        return this.solPrice?.price || this.FALLBACK_PRICE;
    }

    /**
     * Subscribe to price updates
     */
    public subscribe(callback: (price: number) => void): () => void {
        this.listeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Start automatic price updates (once per day)
     */
    private startPriceUpdates(): void {
        // Initial fetch
        this.getSolPrice().catch(error => {
            console.warn('Initial SOL price fetch failed:', error);
        });
        
        // Set up interval for daily updates
        this.updateInterval = setInterval(() => {
            this.getSolPrice().catch(error => {
                console.warn('Scheduled SOL price update failed:', error);
            });
        }, this.UPDATE_INTERVAL);
    }

    /**
     * Stop automatic price updates
     */
    public stopPriceUpdates(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Fetch SOL price from CoinGecko API
     */
    private async fetchSolPrice(): Promise<number> {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CoinGeckoResponse = await response.json();
        
        if (!data.solana?.usd) {
            throw new Error('Invalid response format from CoinGecko');
        }

        return data.solana.usd;
    }

    /**
     * Check if cached price is still valid
     */
    private isCacheValid(): boolean {
        if (!this.solPrice) return false;
        return Date.now() - this.solPrice.lastUpdated < this.CACHE_DURATION;
    }

    /**
     * Notify all listeners of price update
     */
    private notifyListeners(price: number): void {
        this.listeners.forEach(callback => {
            try {
                callback(price);
            } catch (error) {
                console.error('Error in price update listener:', error);
            }
        });
    }

    /**
     * Get price metadata
     */
    public getPriceMetadata(): PriceData | null {
        return this.solPrice;
    }

    /**
     * Force refresh price (bypass cache)
     */
    public async refreshPrice(): Promise<number> {
        try {
            const price = await this.fetchSolPrice();
            this.solPrice = {
                price,
                lastUpdated: Date.now(),
                source: 'coingecko'
            };
            this.notifyListeners(price);
            return price;
        } catch (error) {
            console.error('Failed to refresh SOL price:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const priceService = PriceService.getInstance();
export default priceService;
