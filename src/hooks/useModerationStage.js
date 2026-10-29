import { useEffect, useState } from "react";
import { moderationStage } from "../utils/moderationState";

/**
 * The moderation stage for a check that has been running since `isActive` became
 * true, or null when nothing is in flight.
 *
 * Ticks once a second rather than on every render, and stops with the component,
 * so navigating away mid-check cannot leave a timer behind.
 */
export const useModerationStage = (isActive) => {
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
        if (!isActive) {
            setElapsedMs(0);
            return undefined;
        }

        const startedAt = Date.now();
        setElapsedMs(0);
        const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);

        return () => clearInterval(timer);
    }, [isActive]);

    return isActive ? moderationStage(elapsedMs) : null;
};
