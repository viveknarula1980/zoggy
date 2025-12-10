import React from "react";
import GameCard from "@/components/common/GameCard";

interface GameData {
    id: string;
    title: string;
    image: string;
    path: string;
}

interface ClassicsGamesGridProps {
    games: GameData[];
}

const ClassicsGamesGrid: React.FC<ClassicsGamesGridProps> = ({ games }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {games.map((game) => (
                <GameCard key={game.id} title={game.title} image={game.image} path={game.path} />
            ))}
        </div>
    );
};

export default ClassicsGamesGrid;
