"use client";
import Image from "next/image";
import { useState } from "react";
import { Play, Star, Users } from "lucide-react";
import Link from "next/link";

interface GameCardProps {
    title: string;
    image: string;
    path: string;
}

const GameCard = ({ title, image, path }: GameCardProps) => {
    const [isTouched, setIsTouched] = useState(false);

    const handleTouchStart = () => {
        setIsTouched(true);
    };

    const handleTouchEnd = () => {
        // Keep it visible for a short time after touch ends
        setTimeout(() => setIsTouched(false), 3000);
    };

    return (
        <div 
            className="relative group cursor-pointer"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Card Container */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
                {/* Background Image */}
                <Image 
                    src={image} 
                    alt={title} 
                    fill 
                    sizes="(max-width: 640px) 66vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    quality={85}
                    className="object-cover" 
                />

                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-b from-background-secondary/0 via-background-secondary/50 to-background-secondary/100 transition-opacity duration-300 ${
                    isTouched ? 'opacity-100' : 'opacity-0'
                } md:opacity-0 md:group-hover:opacity-100`} />

                {/* Content Container */}
                <div className={`absolute inset-x-0 bottom-0 z-20 p-5 transition-opacity duration-300 ${
                    isTouched ? 'opacity-100' : 'opacity-0'
                } md:opacity-0 md:group-hover:opacity-100`}>
                    {/* Play Button */}
                    <Link
                        className="
                        w-full bg-neon-pink/80 hover:bg-neon-pink 
                        text-white font-medium py-2.5 rounded-xl
                        flex items-center justify-center gap-2
                        transition-colors duration-300 backdrop-blur-md
                    "
                        href={path}
                    >
                        <Play size={18} className="fill-white" />
                        <span>Play Now</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default GameCard;
