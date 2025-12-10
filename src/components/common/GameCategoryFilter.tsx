"use client";
import React from "react";

interface GameCategoryFilterProps {
    categories: string[];
    activeCategory: string;
    onCategoryChange: (category: string) => void;
}

const GameCategoryFilter = ({ categories, activeCategory, onCategoryChange }: GameCategoryFilterProps) => {
    return (
        <div className="flex flex-wrap gap-3 mb-6">
            <button onClick={() => onCategoryChange("All")} className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeCategory === "All" ? "bg-[#ddfe01] text-black shadow-lg shadow-[#ddfe01]/20" : "bg-[#2a2844] text-white hover:bg-[#2a2844]/80"}`}>
                All Games
            </button>

            {categories.map((category) => (
                <button
                    key={category}
                    onClick={() => onCategoryChange(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeCategory === category ? "bg-[#ddfe01] text-black shadow-lg shadow-[#ddfe01]/20" : "bg-[#2a2844] text-white hover:bg-[#2a2844]/80"}`}
                >
                    {category}
                </button>
            ))}
        </div>
    );
};

export default GameCategoryFilter;
