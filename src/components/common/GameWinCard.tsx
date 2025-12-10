"use client";
import Image from "next/image";

interface GameWinCardProps {
    amount: number;
    image: string;
    id: string;
}

const GameWinCard = ({ amount, image, id }: GameWinCardProps) => {
    return (
        <div className="flex flex-col items-center relative">
            <div className="w-[74px] md:w-[100px] space-y-1 md:space-y-2">
                <div className="relative w-full h-[74px] md:h-[100px] rounded-lg overflow-hidden glass-card shadow-glow">
                    <Image src={image} alt="Game win" width={100} height={100} quality={80}  className="object-cover w-full h-full" />
                </div>
                <div className="px-0.5 md:px-1 flex flex-col items-center">
                    <div className="text-[#00FF20] font-bold text-sm md:text-lg">${amount.toFixed(2)}</div>
                    <div className="text-soft text-[8px] md:text-[11px]">{id}</div>
                </div>
            </div>
        </div>
    );
};

export default GameWinCard;
