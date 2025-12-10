import Navbar from "@/components/common/Navbar";
import { WalletContextProvider } from "@/contexts/WalletContext";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {/* Background gradient */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple/20 via-background to-background -z-10"></div>

            {/* Background colored spots */}
            <div className="fixed top-20 right-[20%] w-64 h-64 bg-neon-pink/10 rounded-full filter blur-3xl -z-10"></div>
            <div className="fixed top-[40%] left-[10%] w-96 h-96 bg-purple/10 rounded-full filter blur-3xl -z-10"></div>
            <div className="fixed bottom-20 right-[15%] w-80 h-80 bg-neon-pink/5 rounded-full filter blur-3xl -z-10"></div>
            <div className="fixed top-[60%] left-[30%] w-72 h-72 bg-purple/8 rounded-full filter blur-3xl -z-10"></div>

            <WalletContextProvider>
                <Navbar />
                <main className="pt-16 px-4">{children}</main>
            </WalletContextProvider>
        </>
    );
}