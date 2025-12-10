"use client";
import Image from "next/image";
import { useState } from "react";
import { Rocket } from "lucide-react";

interface FeaturedGameCardProps {
    title: string;
    image: string;
    description: string;
    players: number;
}

const FeaturedGameCard = ({ title, image, description, players }: FeaturedGameCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isButtonHovered, setIsButtonHovered] = useState(false);

    return (
        <div className="relative overflow-hidden rounded-xl glass-card shadow-glow border border-purple/20" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <div className="flex flex-col md:flex-row h-full">
                <div className="relative w-full overflow-hidden md:w-2/3 h-[300px] md:h-[350px]">
                    <Image src={image} alt={title} width={1800} height={1500} className={`object-cover w-full h-full transition-transform duration-700 ${isHovered ? "scale-110" : "scale-100"}`} />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>

                    <div className="absolute top-6 left-6 bg-purple-800/50 backdrop-blur-sm text-light text-sm py-1 px-3 rounded-lg flex items-center gap-2">
                        <Rocket color="#ffffff" />
                        <span>FEATURED</span>
                    </div>

                    <div className="absolute bottom-0 left-0 p-6 w-full md:w-2/3">
                        <h2 className="text-light text-3xl font-bold mb-3">{title}</h2>
                        <p className="text-light mb-4 line-clamp-2">{description}</p>

                        <div className="flex items-center gap-4">
                            <button
                                className="group relative overflow-hidden bg-neon-pink text-light font-semibold py-2 px-6 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-glow hover:bg-purple"
                                onMouseEnter={() => setIsButtonHovered(true)}
                                onMouseLeave={() => setIsButtonHovered(false)}
                            >
                                <span className="relative z-10">Play Now</span>
                            </button>

                            <div className="flex items-center text-light">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                </svg>
                                <span>{players.toLocaleString()} players</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex md:w-1/3 glass-dark p-6 flex-col justify-between">
                    <div>
                        <h3 className="text-light text-xl font-bold mb-4">Game Features</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center text-soft">
                                <div className="w-2 h-2 rounded-full bg-neon-pink mr-3"></div>
                                Multiplayer support
                            </li>
                            <li className="flex items-center text-soft">
                                <div className="w-2 h-2 rounded-full bg-neon-pink mr-3"></div>
                                Live tournaments
                            </li>
                            <li className="flex items-center text-soft">
                                <div className="w-2 h-2 rounded-full bg-neon-pink mr-3"></div>
                                Daily rewards
                            </li>
                            <li className="flex items-center text-soft">
                                <div className="w-2 h-2 rounded-full bg-neon-pink mr-3"></div>
                                Leaderboards
                            </li>
                        </ul>
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-soft">Online now</span>
                            <span className="text-neon-pink font-bold">{Math.floor(players * 0.15).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-soft/30 rounded-full h-2">
                            <div className="bg-neon-pink h-2 rounded-full" style={{ width: "15%" }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeaturedGameCard;
