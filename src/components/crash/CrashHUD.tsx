// "use client";

// import React from "react";

// interface CrashHUDProps {
//     displayMultiplier: number;
// }

// const formatMultiplier = (m: number) => `${m.toFixed(2)}x`;

// const CrashHUD = ({ displayMultiplier }: CrashHUDProps) => {
//     return (
//         <div className="absolute top-4 right-4 bg-background-secondary/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple/30">
//             <div className="text-center">
//                 <div className="text-lg font-bold text-neon-pink">{formatMultiplier(displayMultiplier)}</div>
//                 <div className="text-xs text-soft">Current</div>
//             </div>
//         </div>
//     );
// };

// export default CrashHUD;


"use client";

import React from "react";

interface CrashHUDProps {
  displayMultiplier: number;
}

const formatMultiplier = (m: number) => `${m.toFixed(2)}x`;

const CrashHUD = ({ displayMultiplier }: CrashHUDProps) => {
  return (
    <div className="absolute top-4 right-4 bg-background-secondary/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple/30">
      <div className="text-center">
        <div className="text-lg font-bold text-neon-pink">
          {formatMultiplier(displayMultiplier)}
        </div>
        <div className="text-xs text-soft">Current</div>
      </div>
    </div>
  );
};

export default CrashHUD;
