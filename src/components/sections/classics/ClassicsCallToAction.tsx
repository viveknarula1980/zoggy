import React from "react";

interface ClassicsCallToActionProps {
    onConnectWallet: () => void;
}

const ClassicsCallToAction: React.FC<ClassicsCallToActionProps> = ({ onConnectWallet }) => {
    return (
        <div className="text-center mt-16">
            <div className="glass p-8 rounded-2xl max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-light mb-4">Ready to Start Playing?</h3>
                <p className="text-soft mb-6">Connect your wallet and dive into the exciting world of crypto gaming</p>
                <button onClick={onConnectWallet} className="bg-neon-pink text-white px-8 py-3 rounded-xl font-semibold hover:shadow-glow transition-all duration-300 transform hover:scale-105">
                    Connect Wallet & Play
                </button>
            </div>
        </div>
    );
};

export default ClassicsCallToAction;
