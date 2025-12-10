import { useCallback } from "react";
import usePDAWallet from "./usePDAWallet";
import ToastService from "../toastService";

/**
 * Custom hook that provides game-specific wallet functions
 * This shows how to integrate PDA wallet with actual gameplay
 */
export default function usePDAWalletGameplay() {
    const { balance, placeBet, addWinnings, formatBalance } = usePDAWallet();

    // Check if user has enough balance to place a bet
    const canPlaceBet = useCallback(
        (betAmount: number): boolean => {
            return balance >= betAmount;
        },
        [balance]
    );

    // Handle game start - deduct bet amount
    const startGame = useCallback(
        (betAmount: number): boolean => {
            if (!canPlaceBet(betAmount)) {
                console.warn(`Insufficient balance. Required: ${betAmount} SOL, Available: ${balance} SOL`);
                ToastService.error(`Insufficient balance. Required: ${betAmount} SOL, Available: ${balance} SOL`);
                return false;
            }

            placeBet(betAmount);
            console.log(`Game started with bet: ${betAmount} SOL`);
            ToastService.gameStart("Game started", betAmount);
            return true;
        },
        [balance, canPlaceBet, placeBet]
    );

    // Handle game win - add winnings to balance
    const handleWin = useCallback(
        (winAmount: number) => {
            addWinnings(winAmount);
            console.log(`Game won! Added ${winAmount} SOL to balance`);
            ToastService.gameWin("You won!", winAmount);
        },
        [addWinnings]
    );

    // Handle game loss - nothing to do (bet already deducted)
    const handleLoss = useCallback(() => {
        console.log("Game lost. Better luck next time!");
        ToastService.gameLoss("Better luck next time!");
        // Dispatch event for UI updates
        window.dispatchEvent(
            new CustomEvent("gameCompleted", {
                detail: { winAmount: 0, isWin: false },
            })
        );
    }, []);

    // Calculate potential winnings based on multiplier
    const calculateWinnings = useCallback((betAmount: number, multiplier: number): number => {
        return betAmount * multiplier;
    }, []);

    return {
        balance,
        formatBalance,
        canPlaceBet,
        startGame,
        handleWin,
        handleLoss,
        calculateWinnings,
    };
}

/**
 * Example usage in a game component:
 *
 * const GameComponent = () => {
 *   const [betAmount, setBetAmount] = useState(1);
 *   const [isPlaying, setIsPlaying] = useState(false);
 *   const { balance, canPlaceBet, startGame, handleWin, handleLoss, calculateWinnings } = usePDAWalletGameplay();
 *
 *   const playGame = () => {
 *     if (!startGame(betAmount)) {
 *       toast.error("Insufficient balance!");
 *       return;
 *     }
 *
 *     setIsPlaying(true);
 *
 *     // Simulate game logic
 *     setTimeout(() => {
 *       const isWin = Math.random() > 0.5; // 50% win chance
 *
 *       if (isWin) {
 *         const multiplier = 2.0; // 2x multiplier
 *         const winnings = calculateWinnings(betAmount, multiplier);
 *         handleWin(winnings);
 *       } else {
 *         handleLoss();
 *       }
 *
 *       setIsPlaying(false);
 *     }, 2000);
 *   };
 *
 *   return (
 *     <div>
 *       <p>Balance: {formatBalance(2)}</p>
 *       <input
 *         type="number"
 *         value={betAmount}
 *         onChange={(e) => setBetAmount(Number(e.target.value))}
 *         min="0.1"
 *         step="0.1"
 *       />
 *       <button
 *         onClick={playGame}
 *         disabled={isPlaying || !canPlaceBet(betAmount)}
 *       >
 *         {isPlaying ? 'Playing...' : 'Play Game'}
 *       </button>
 *     </div>
 *   );
 * };
 */
