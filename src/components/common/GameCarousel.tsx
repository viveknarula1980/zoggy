"use client";
import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import GameCard from "@/components/common/GameCard";

interface GameData {
    title: string;
    image: string;
    category: string;
    isPopular?: boolean;
    onlineCount?: number;
    path: string;
}

interface GameCarouselProps {
    games: GameData[];
    title?: string;
    indicatorColor?: string;
    showTitle?: boolean;
}

const GameCarousel = ({ games, title, indicatorColor = "#ddfe01", showTitle = true }: GameCarouselProps) => {
    const [autoplayPlugin] = useState(() => Autoplay({ delay: 3000, stopOnInteraction: false }));
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", slidesToScroll: 1, dragFree: true }, [autoplayPlugin]);

    const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
    const [nextBtnEnabled, setNextBtnEnabled] = useState(true);

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setPrevBtnEnabled(emblaApi.canScrollPrev());
        setNextBtnEnabled(emblaApi.canScrollNext());
    }, [emblaApi]);

    const handleMouseEnter = useCallback(() => {
        autoplayPlugin.stop();
    }, [autoplayPlugin]);

    const handleMouseLeave = useCallback(() => {
        autoplayPlugin.play();
    }, [autoplayPlugin]);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on("select", onSelect);
        onSelect();

        return () => {
            emblaApi.off("select", onSelect);
        };
    }, [emblaApi, onSelect]);

    return (
        <div>
            {showTitle && (
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {/* <div className="w-3 h-3 rounded-full" style={{ backgroundColor: indicatorColor }}></div> */}
                        <h2 className="text-light text-xl font-semibold">{title}</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* View All Link */}
                        <Link href="/classics" className="text-light text-sm font-semibold hover:text-neon-pink transition-colors">
                            View All
                        </Link>

                        <div className="flex items-center gap-2">
                            {/* Prev Button */}
                            <button
                                onClick={scrollPrev}
                                disabled={!prevBtnEnabled}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${prevBtnEnabled ? "bg-background-secondary hover:bg-neon-pink text-light hover:text-background cursor-pointer" : "bg-background-secondary/50 text-soft cursor-not-allowed"}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
                                </svg>
                            </button>

                            {/* Next Button */}
                            <button
                                onClick={scrollNext}
                                disabled={!nextBtnEnabled}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${nextBtnEnabled ? "bg-background-secondary hover:bg-neon-pink text-light hover:text-background cursor-pointer" : "bg-background-secondary/50 text-soft cursor-not-allowed"}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-hidden mb-8" ref={emblaRef}>
                <div className="flex -ml-4">
                    {games.map((game, index) => (
                        <div
                            key={index}
                            className="flex-[0_0_66.67%] min-w-0 sm:flex-[0_0_50%] md:flex-[0_0_33.33%] lg:flex-[0_0_25%] pl-4"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <GameCard title={game.title} image={game.image} path={game.path} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GameCarousel;
