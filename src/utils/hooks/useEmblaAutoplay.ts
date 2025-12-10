import { useCallback, useEffect, useState } from "react";
import type { EmblaCarouselType } from "embla-carousel";
import type { AutoplayType } from "embla-carousel-autoplay";

export const useEmblaAutoplay = (emblaApi: EmblaCarouselType | undefined) => {
    const [isPlaying, setIsPlaying] = useState(false);

    const getAutoplay = (): AutoplayType | undefined => {
        return (emblaApi?.plugins() as { autoplay?: AutoplayType })?.autoplay;
    };

    const toggleAutoplay = useCallback(() => {
        const autoplay = getAutoplay();
        if (!autoplay) return;

        if (autoplay.isPlaying()) {
            autoplay.stop();
            setIsPlaying(false); // ✅ Immediately update state
        } else {
            autoplay.play();
            setIsPlaying(true); // ✅ Immediately update state
        }
    }, [emblaApi]);

    useEffect(() => {
        const autoplay = getAutoplay();
        if (!autoplay) return;

        setIsPlaying(autoplay.isPlaying());

        const updateState = () => setIsPlaying(autoplay.isPlaying());

        emblaApi?.on("autoplay:play", updateState);
        emblaApi?.on("autoplay:stop", updateState);

        return () => {
            emblaApi?.off("autoplay:play", updateState);
            emblaApi?.off("autoplay:stop", updateState);
        };
    }, [emblaApi]);

    return {
        isPlaying,
        toggleAutoplay,
    };
};
