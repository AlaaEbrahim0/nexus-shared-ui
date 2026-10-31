import { useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";

/**
 * One scroll policy for every route in a portal.
 *
 * - New navigations start at the top (or at an explicit #anchor).
 * - Back/Forward restore the position saved for that history entry.
 * - Search-only changes and local component state do not move the viewport.
 *
 * The layout scrolls the document, so this intentionally targets window rather
 * than a portal-specific container.
 */
const positions = new Map();
const positionsByLocation = new Map();

export const ScrollManager = () => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const previous = useRef({ key: null, pathname: null, hash: null });
    const frameRef = useRef(null);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const previousRestoration = window.history.scrollRestoration;
        window.history.scrollRestoration = "manual";

        return () => {
            window.history.scrollRestoration = previousRestoration;
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const savePosition = () => {
            const path = `${location.pathname}${location.search}`;
            positions.set(location.key, window.scrollY);
            positionsByLocation.set(path, window.scrollY);
        };
        savePosition();
        window.addEventListener("scroll", savePosition, { passive: true });

        return () => {
            window.removeEventListener("scroll", savePosition);
        };
    }, [location.key, location.pathname, location.search]);

    useLayoutEffect(() => {
        if (typeof window === "undefined") return undefined;

        const previousLocation = previous.current;
        // Capture the outgoing entry before the destination paints. Some
        // headless and embedded browsers do not emit a final scroll event on
        // programmatic navigation, so the listener alone is not enough.
        if (previousLocation.key && previousLocation.pathname) {
            positions.set(previousLocation.key, window.scrollY);
            positionsByLocation.set(
                previousLocation.path || previousLocation.pathname,
                window.scrollY
            );
        }
        const pathnameChanged = previousLocation.pathname !== location.pathname;
        const hashChanged = previousLocation.hash !== location.hash;
        previous.current = {
            key: location.key,
            pathname: location.pathname,
            path: `${location.pathname}${location.search}`,
            hash: location.hash,
        };

        if (!pathnameChanged && !hashChanged) {
            return undefined;
        }

        // A hash-only change should move to the anchor; removing a hash is not
        // a reason to jump to the top unless the path also changed.
        if (!pathnameChanged && !location.hash) {
            return undefined;
        }

        const applyScroll = () => {
            if (location.hash) {
                let target = null;
                try {
                    target = document.getElementById(
                        decodeURIComponent(location.hash.slice(1))
                    );
                } catch {
                    target = null;
                }
                if (target) {
                    target.scrollIntoView({ block: "start" });
                    return;
                }
            }

            if (navigationType === "POP") {
                const saved = positions.get(location.key) ??
                    positionsByLocation.get(`${location.pathname}${location.search}`);
                if (typeof saved === "number") {
                    // Content may still be loading when Back/Forward returns;
                    // retry briefly until the saved position is reachable.
                    const restore = (attempt = 0) => {
                        window.scrollTo(0, saved);
                        if (attempt < 6 && Math.abs(window.scrollY - saved) > 2) {
                            window.setTimeout(() => restore(attempt + 1), 80);
                        }
                    };
                    restore();
                    return;
                }
            }

            window.scrollTo(0, 0);
        };

        // Let the destination commit before measuring anchors/scroll height.
        frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = window.requestAnimationFrame(applyScroll);
        });

        return () => {
            if (frameRef.current) {
                window.cancelAnimationFrame(frameRef.current);
            }
        };
    }, [location.key, location.pathname, location.hash, location.search, navigationType]);

    return null;
};

export const RootScrollLayout = () => (
    <>
        <ScrollManager />
        <Outlet />
    </>
);
