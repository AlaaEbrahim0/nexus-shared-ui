import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";

/**
 * One scroll policy for every route in a portal.
 *
 * - New pushes/replacements start at the top, or at an explicit #anchor.
 * - Browser Back/Forward keeps native scroll restoration; we only intervene
 *   when the destination has a hash anchor.
 * - Search-only changes and local state updates do not move the viewport.
 *
 * The routed layouts scroll the document, so this intentionally targets window.
 */
export const ScrollManager = () => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const previous = useRef({ key: null, pathname: null, hash: null });
    const frameRef = useRef(null);

    useLayoutEffect(() => {
        if (typeof window === "undefined") return undefined;

        const previousLocation = previous.current;
        const isInitial = previousLocation.key === null;
        const pathnameChanged = previousLocation.pathname !== location.pathname;
        const hashChanged = previousLocation.hash !== location.hash;

        previous.current = {
            key: location.key,
            pathname: location.pathname,
            hash: location.hash,
        };

        if (!pathnameChanged && !hashChanged) {
            return undefined;
        }

        // Removing a hash is not a navigation; do not jump to the top.
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

            // Let the browser restore Back/Forward entries natively. Only a
            // new entry (or the first load/refresh) starts at the top.
            if (!isInitial && navigationType === "POP" && pathnameChanged) {
                return;
            }

            window.scrollTo(0, 0);
        };

        // Let the destination commit before measuring an anchor.
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
