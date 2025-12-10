import { Gamepad2, Play, DollarSign, TrendingUp } from "lucide-react";
import StatsGrid from "../common/StatsGrid";

interface GameStatsProps {
  totalGames: number;
  activeGames: number;
  totalRevenue: number;
  totalPlayed: number;
}

export default function GameStats({ totalGames, activeGames, totalRevenue, totalPlayed }: GameStatsProps) {
  const stats = [
    {
      title: "Total Games",
      value: totalGames.toString(),
      icon: Gamepad2,
      color: "text-blue-400",
    },
    {
      title: "Active Games", 
      value: activeGames.toString(),
      icon: Play,
      color: "text-green-400",
    },
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      title: "Games Played",
      value: totalPlayed.toLocaleString(),
      icon: TrendingUp,
      color: "text-purple-400",
    },
  ];

  return <StatsGrid stats={stats} columns={4} />;
}
