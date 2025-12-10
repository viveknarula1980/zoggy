import React from "react";
import { Gamepad2 } from "lucide-react";

const ClassicsHeader = () => {
    return (
        <div className="text-center mb-12">
            <div className="flex items-center justify-start gap-3 mb-4">
                <Gamepad2 className="w-12 h-12 text-neon-pink" />
                <h1 className="gradient-text text-4xl md:text-6xl font-bold">Classic Games</h1>
            </div>
            {/* <p className="text-soft text-lg md:text-xl max-w-2xl mx-auto">
                Experience the timeless thrill of classic casino games with modern crypto rewards
            </p> */}
        </div>
    );
};

export default ClassicsHeader;
