"use client";
import { BookOpen, Search, Settings, Shield, Key, Hash, Eye, Target, Lock, Zap, CheckCircle, BarChart3, Rocket, Gamepad2, Bomb, Dice6, Circle, Coins } from "lucide-react";

export default function HowItWorks() {
    return (
        <div className="glass rounded-2xl p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-light mb-2 flex items-center gap-2">
                    <BookOpen size={24} />
                    How It Works
                </h2>
                <p className="text-soft">
                    Understanding our provably fair system and cryptographic verification
                </p>
            </div>

            <div className="space-y-6">
                {/* Overview */}
                <div className="glass-dark rounded-xl p-4 border border-purple/20">
                    <h3 className="text-lg font-semibold text-light mb-3 flex items-center gap-2">
                        <Search size={20} />
                        What is Provably Fair?
                    </h3>
                    <p className="text-soft leading-relaxed">
                        Provably fair is a cryptographic method that allows players to verify that game outcomes 
                        are truly random and not manipulated by the casino. Every game result can be independently 
                        verified using mathematical proof.
                    </p>
                </div>

                {/* How it Works */}
                <div className="glass-dark rounded-xl p-4 border border-purple/20">
                    <h3 className="text-lg font-semibold text-light mb-3 flex items-center gap-2">
                        <Settings size={20} />
                        The Process
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-neon-pink rounded-full flex items-center justify-center text-light font-bold">1</div>
                            <div>
                                <h4 className="font-medium text-light mb-1">Server Seed Generation</h4>
                                <p className="text-soft text-sm">
                                    Before each game, our server generates a random seed (hash) that determines the outcome.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-neon-pink rounded-full flex items-center justify-center text-light font-bold">2</div>
                            <div>
                                <h4 className="font-medium text-light mb-1">Client Seed Input</h4>
                                <p className="text-soft text-sm">
                                    You can provide your own client seed to influence the randomness, ensuring we can't predict outcomes.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-neon-pink rounded-full flex items-center justify-center text-light font-bold">3</div>
                            <div>
                                <h4 className="font-medium text-light mb-1">Nonce Counter</h4>
                                <p className="text-soft text-sm">
                                    Each bet increments a nonce counter, ensuring every game has a unique result.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-neon-pink rounded-full flex items-center justify-center text-light font-bold">4</div>
                            <div>
                                <h4 className="font-medium text-light mb-1">HMAC Generation</h4>
                                <p className="text-soft text-sm">
                                    We combine server seed + client seed + nonce using HMAC-SHA256 to generate the final result.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Verification Steps */}
                <div className="glass-dark rounded-xl p-4 border border-purple/20">
                    <h3 className="text-lg font-semibold text-light mb-3 flex items-center gap-2">
                        ✅ How to Verify
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <span className="text-neon-pink">•</span>
                            <p className="text-soft text-sm">
                                Copy the server seed, client seed, and nonce from any completed game
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-neon-pink">•</span>
                            <p className="text-soft text-sm">
                                Use our manual verification tool or any third-party HMAC calculator
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-neon-pink">•</span>
                            <p className="text-soft text-sm">
                                Compare the computed HMAC with the expected result - they should match exactly
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-neon-pink">•</span>
                            <p className="text-soft text-sm">
                                The game outcome is derived from the HMAC using game-specific algorithms
                            </p>
                        </div>
                    </div>
                </div>

                {/* Game-Specific Algorithms */}
                <div className="glass-dark rounded-xl p-4 border border-purple/20">
                    <h3 className="text-lg font-semibold text-light mb-3 flex items-center gap-2">
                        <Gamepad2 size={20} />
                        Game Algorithms
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-light flex items-center gap-2">
                                <Rocket size={16} />
                                Crash
                            </h4>
                            <p className="text-soft text-sm">
                                HMAC converted to decimal, then transformed using exponential function to determine crash point.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-light flex items-center gap-2">
                                <Dice6 size={16} />
                                Dice
                            </h4>
                            <p className="text-soft text-sm">
                                HMAC modulo 100 to get a number between 0-99, representing the dice roll result.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-light flex items-center gap-2">
                                <Bomb size={16} />
                                Mines
                            </h4>
                            <p className="text-soft text-sm">
                                HMAC used to shuffle grid positions, determining mine placement using Fisher-Yates algorithm.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-light flex items-center gap-2">
                                <Coins size={16} />
                                Coinflip
                            </h4>
                            <p className="text-soft text-sm">
                                HMAC modulo 2 determines heads (0) or tails (1) outcome.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Security Features */}
                <div className="glass-dark rounded-xl p-4 border border-purple/20">
                    <h3 className="text-lg font-semibold text-light mb-3 flex items-center gap-2">
                        <Shield size={20} />
                        Security Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-light flex items-center gap-2">
                                <Lock size={16} />
                                Cryptographic Security
                            </h4>
                            <p className="text-soft text-sm">
                                Uses industry-standard HMAC-SHA256 encryption that's impossible to reverse-engineer.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-light flex items-center gap-2">
                                <Hash size={16} />
                                Seed Rotation
                            </h4>
                            <p className="text-soft text-sm">
                                Server seeds are rotated regularly and revealed after use for complete transparency.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-light flex items-center gap-2">
                                <Eye size={16} />
                                Public Verification
                            </h4>
                            <p className="text-soft text-sm">
                                All game data is publicly available for independent verification by anyone.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-light">⚡ Real-time Results</h4>
                            <p className="text-soft text-sm">
                                Live feed shows all game results in real-time with immediate verification status.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="text-center p-4 glass-dark rounded-xl border border-neon-pink/30">
                    <h3 className="text-lg font-semibold text-light mb-2">
                        🎯 Ready to Verify?
                    </h3>
                    <p className="text-soft text-sm mb-4">
                        Use our manual verification tool to check any game result or watch the live results feed.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <span className="px-4 py-2 bg-neon-pink/20 text-neon-pink rounded-lg text-sm font-medium">
                            100% Transparent
                        </span>
                        <span className="px-4 py-2 bg-purple/20 text-purple-300 rounded-lg text-sm font-medium">
                            Cryptographically Secure
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
