import { Crown } from "lucide-react";
import React from "react";

// Define types
interface User {
    address: string;
    icon: string;
}

interface Game {
    name: string;
    image: string;
}

interface WinRow {
    id?: string;
    user: User;
    game: Game;
    time: string;
    bet: string;
    multiplier: string;
    payout: string;
}

interface WinsTableProps {
    data: WinRow[];
}

const WinsTable: React.FC<WinsTableProps> = ({ data }) => {
    const tableHeaders = ["Game", "User", "Time", "Bet", "Multiplier", "Payout"];
    
    // Get standardized game image based on game name
    const getGameImage = (gameName: string): string => {
        const name = gameName.toLowerCase().trim();
        switch (name) {
            case "crash":
                return "/assets/display-images/crash.png";
            case "plinko":
                return "/assets/display-images/plinko.png";
            case "coinflip":
            case "coin flip":
                return "/assets/display-images/coinflip.png";
            case "mines":
                return "/assets/display-images/mines.png";
            case "dice":
            case "dice roll":
                return "/assets/display-images/dice.png";
            case "slots":
            case "slot machine":
            case "memeslot":
                return "/assets/display-images/memeslot.png";
            default:
                return "/assets/display-images/crash.png";
        }
    };
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-soft/10 text-soft">
                        {tableHeaders.map((header, index) => (
                            <th key={index} className="text-left py-4 px-4 text-sm font-medium ">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-12 text-soft">
                                No data found for this category.
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => (
                            <tr
                                key={row.id || idx}
                                className="border-b border-soft/10 hover:bg-soft/5 transition-all duration-500 text-sm animate-slide-in animate-highlight"
                                style={{
                                    animationDelay: `${idx * 50}ms`,
                                    animationFillMode: 'both'
                                }}
                            >
                                <td className="py-3 px-4 min-w-[100px]">
                                    <div className="flex items-center gap-3">
                                        <img src={getGameImage(row.game.name)} alt={row.game.name} className="w-8 h-8 rounded-lg" />
                                        <span className="text-soft md:text-base">{row.game.name}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-4 min-w-[150px]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <Crown className="w-4 h-4 text-yellow-300" />
                                            {/* <img src="/assets/rank-icon.svg" alt="rank" className="w-4 h-4" /> */}
                                        </div>
                                        <span className="text-soft font-medium">
                                            {row.user.address.slice(0, 6)}...{row.user.address.slice(-4)}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-3 px-4  text-soft min-w-[100px]">{row.time} ago</td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        <img src="/sol-logo.svg" alt="SOL" className="w-4 h-4" />
                                        <span className="font-medium text-light">{row.bet}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <span className=" font-medium text-light">{row.multiplier}x</span>
                                </td>
                                <td className="py-3 px-4 min-w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-[#00FF20]">$ {row.payout}</span>
                                        <img src="/sol-logo.svg" alt="SOL" className="w-4 h-4" />
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default WinsTable;
