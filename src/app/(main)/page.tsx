import LiveWinsSection from "@/components/sections/HomeSections/section-live-wins";
import SectionGames from "@/components/sections/HomeSections/section-games";
import SectionHero from "@/components/sections/HomeSections/section-hero";
import SectionAllWins from "@/components/sections/HomeSections/section-all-wins";
import AutoConnect from "@/utils/autoConnectOnRedirect";

export default function Home() {
    return (
        <div className="min-h-screen">
            <AutoConnect />
            <LiveWinsSection />
            <SectionHero />
            <SectionGames />
            <SectionAllWins />
        </div>
    );
}
