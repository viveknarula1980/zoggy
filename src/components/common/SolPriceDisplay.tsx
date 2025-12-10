"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import priceService from '@/utils/priceService';

interface SolPriceDisplayProps {
    className?: string;
    showRefreshButton?: boolean;
    compact?: boolean;
}

export default function SolPriceDisplay({ 
    className = "", 
    showRefreshButton = false, 
    compact = false 
}: SolPriceDisplayProps) {
    const [price, setPrice] = useState<number>(priceService.getCachedSolPrice());
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Handle price updates from the service
    const handlePriceUpdate = useCallback((newPrice: number) => {
        setPrice(newPrice);
        setLastUpdated(new Date());
        setError(null);
    }, []);

    // Manual refresh function
    const refreshPrice = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const newPrice = await priceService.refreshPrice();
            setPrice(newPrice);
            setLastUpdated(new Date());
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Subscribe to price updates on mount
    useEffect(() => {
        // Initial price fetch
        const initializePrice = async () => {
            setIsLoading(true);
            try {
                const initialPrice = await priceService.getSolPrice();
                setPrice(initialPrice);
                setLastUpdated(new Date());
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to fetch initial price';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        initializePrice();

        // Subscribe to price updates
        const unsubscribe = priceService.subscribe(handlePriceUpdate);

        // Cleanup subscription on unmount
        return unsubscribe;
    }, [handlePriceUpdate]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price);
    };

    const formatLastUpdated = (date: Date | null) => {
        if (!date) return 'Never';
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);

        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        return date.toLocaleTimeString();
    };

    const handleRefresh = async () => {
        try {
            await refreshPrice();
        } catch (error) {
            console.error('Failed to refresh price:', error);
        }
    };

    if (compact) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-soft">SOL</span>
                    <span className="text-sm font-medium text-light">
                        {isLoading ? '...' : formatPrice(price)}
                    </span>
                </div>
                {error && (
                    <div className="w-2 h-2 bg-red-400 rounded-full" title={error} />
                )}
            </div>
        );
    }

    return (
        <div className={`bg-background-secondary/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple/30 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-soft">SOL/USD</span>
                        {/* Price trend indicator could be added here */}
                    </div>
                    <div className="text-sm font-bold text-light">
                        {isLoading ? (
                            <div className="flex items-center gap-1">
                                <RefreshCw size={12} className="animate-spin" />
                                Loading...
                            </div>
                        ) : error ? (
                            <span className="text-red-400">Error</span>
                        ) : (
                            formatPrice(price)
                        )}
                    </div>
                </div>

                {showRefreshButton && (
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="p-1 rounded hover:bg-purple/20 transition-colors disabled:opacity-50"
                        title="Refresh price"
                    >
                        <RefreshCw size={12} className={`text-soft hover:text-light ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>

            {/* Last updated info */}
            <div className="text-xs text-soft mt-1">
                {error ? (
                    <span className="text-red-400">{error}</span>
                ) : (
                    `Updated ${formatLastUpdated(lastUpdated)}`
                )}
            </div>
        </div>
    );
}
