// "use client";

// import React from "react";

// interface CrashStatsProps {
//     betAmount: number;
//     autoCashout: number | null;
//     gameResult: {
//         type: 'win' | 'loss' | null;
//         multiplier: number | null;
//         winAmount: number;
//     };
// }

// const formatMultiplier = (m: number) => `${m.toFixed(2)}x`;

// const CrashStats: React.FC<CrashStatsProps> = ({ betAmount, autoCashout, gameResult }) => {
//     return (
//         <div className="absolute bottom-0 left-0 right-0 bg-background-secondary/80 backdrop-blur-sm border-t border-purple/20 p-4">
//             <div className="grid grid-cols-3 gap-4 text-center text-sm">
//                 <div>
//                     <div className="text-soft">Bet Amount</div>
//                     <div className="text-light font-semibold">${betAmount.toFixed(2)}</div>
//                 </div>
//                 <div>
//                     <div className="text-soft">Auto Cashout</div>
//                     <div className="text-neon-pink font-semibold">{autoCashout ? formatMultiplier(autoCashout) : 'Off'}</div>
//                 </div>
//                 <div>
//                     <div className="text-soft">Result</div>
//                     <div className={`font-semibold ${
//                         gameResult.type === 'win' ? 'text-green-400' : 
//                         gameResult.type === 'loss' ? 'text-red-400' : 'text-soft'
//                     }`}>
//                         {gameResult.type === 'win' ? 'WIN!' : gameResult.type === 'loss' ? 'CRASHED' : '--'}
//                     </div>
//                 </div>
//             </div>
//             {gameResult.type && gameResult.multiplier && (
//                 <div className="mt-3 pt-3 border-t border-purple/20">
//                     <div className="grid grid-cols-2 gap-4 text-center text-sm">
//                         <div>
//                             <div className="text-soft text-xs">Final Multiplier</div>
//                             <div className="text-lg font-bold text-neon-pink">
//                                 {formatMultiplier(gameResult.multiplier)}
//                             </div>
//                         </div>
//                         <div>
//                             <div className="text-soft text-xs">Amount Won/Lost</div>
//                             <div className={`text-lg font-bold ${
//                                 gameResult.type === 'win' ? 'text-green-400' : 'text-red-400'
//                             }`}>
//                                 {gameResult.type === 'win' ? '+' : '-'}${Math.abs(gameResult.winAmount).toFixed(2)}
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default CrashStats;



"use client";

import React from "react";

interface CrashStatsProps {
  betAmount: number;
  autoCashout: number | null;
  gameResult: {
    type: "win" | "loss" | null;
    multiplier: number | null;
    winAmount: number;
  };
}

const formatMultiplier = (m: number) => `${m.toFixed(2)}x`;

const CrashStats: React.FC<CrashStatsProps> = ({ betAmount, autoCashout, gameResult }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-background-secondary/80 backdrop-blur-sm border-t border-purple/20 p-4">
      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="text-soft">Bet Amount</div>
          <div className="text-light font-semibold">${betAmount.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-soft">Auto Cashout</div>
          <div className="text-neon-pink font-semibold">
            {autoCashout ? formatMultiplier(autoCashout) : "Off"}
          </div>
        </div>
        <div>
          <div className="text-soft">Result</div>
          <div
            className={`font-semibold ${
              gameResult.type === "win"
                ? "text-green-400"
                : gameResult.type === "loss"
                ? "text-red-400"
                : "text-soft"
            }`}
          >
            {gameResult.type === "win" ? "WIN!" : gameResult.type === "loss" ? "CRASHED" : "--"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrashStats;
