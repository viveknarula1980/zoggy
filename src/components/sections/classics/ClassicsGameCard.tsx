import React from "react";
import Link from "next/link";

export interface GameCard {
    id: string;
    title: string;
    icon: string;
    description: string;
    features: string[];
    href: string;
    isPopular?: boolean;
    isNew?: boolean;
}

interface GameCardProps {
    game: GameCard;
}

const ClassicsGameCard: React.FC<GameCardProps> = ({ game }) => {
    const CardContent = (
        <div className="glass-card p-6 rounded-2xl h-full flex flex-col relative overflow-hidden">
            {/* Background gradient overlay */}
            <div className="absolute inset-0 glass"></div>

            {/* Badges */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                {game.isPopular && <span className="bg-neon-pink/20 text-neon-pink text-xs px-2 py-1 rounded-full border border-neon-pink/30">Popular</span>}
                {game.isNew && <span className="bg-purple/20 text-purple text-xs px-2 py-1 rounded-full border border-purple/30">New</span>}
            </div>

            {/* Game Icon */}
            <div className="text-5xl mb-4 relative z-10">{game.icon}</div>

            {/* Game Title */}
            <h3 className="text-xl font-bold text-light mb-3 relative z-10">{game.title}</h3>

            {/* Game Description */}
            <p className="text-soft text-sm mb-4 leading-relaxed flex-grow relative z-10">{game.description}</p>

            {/* Features */}
            <div className="space-y-2 mb-6 relative z-10">
                {game.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-neon-pink rounded-full"></div>
                        <span className="text-xs text-soft">{feature}</span>
                    </div>
                ))}
            </div>

            {/* Play Button */}
            <button className="w-full bg-neon-pink text-light py-3 rounded-xl font-semibold border border-purple/30 relative z-10">{game.href === "#" ? "Coming Soon" : "Play Now"}</button>
        </div>
    );

    if (game.href === "#") {
        return <div className="cursor-not-allowed opacity-75 h-full">{CardContent}</div>;
    }

    return (
        <Link href={game.href} className="block h-full">
            {CardContent}
        </Link>
    );
};

export default ClassicsGameCard;
