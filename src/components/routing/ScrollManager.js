import { useEffect, useLayoutEffect, useRef } from "react";
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
const scrollStoreKey = (path) => `nexus.scroll.path.${path}`;

export const ScrollManager = () => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const previous = useRef({ key: null, pathname: null, hash: null });
    const frameRef = useRef(null);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const saveLinkScroll = (event) => {
            if (!event.target?.closest?.("a[href]")) return;
            const path = `${window.location.pathname}${window.location.search}`;
            try {
                window.sessionStorage.setItem(scrollStoreKey(path), String(window.scrollY));
            } catch {
                // Private mode/quota: native restoration remains in charge.
            }
        };

        const restore = (attempt = 0) => {
            let saved = null;
            try {
                saved = window.sessionStorage.getItem(
                    scrollStoreKey(`${window.location.pathname}${window.location.search}`)
                );
            } catch {
                saved = null;
            }
            if (saved === null) return;

            const target = Number(saved);
            window.scrollTo(0, target);
            if (attempt < 8 && Math.abs(window.scrollY - target) > 2) {
                window.setTimeout(() => restore(attempt + 1), 80);
            }
        };

        const handlePopState = () => restore();
        document.addEventListener("pointerdown", saveLinkScroll, true);
        document.addEventListener("mousedown", saveLinkScroll, true);
        window.addEventListener("popstate", handlePopState);

        return () => {
            document.removeEventListener("pointerdown", saveLinkScroll, true);
            document.removeEventListener("mousedown", saveLinkScroll, true);
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

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

                // Deep links (for example a comment anchor) may be rendered
                // after their data loads. Retry briefly before falling back.
                let attempts = 0;
                const waitForAnchor = () => {
                    const anchor = document.getElementById(
                        decodeURIComponent(location.hash.slice(1))
                    );
                    if (anchor) {
                        anchor.scrollIntoView({ block: "start" });
                        return;
                    }
                    attempts += 1;
                    if (attempts < 10) {
                        window.setTimeout(waitForAnchor, 80);
                        return;
                    }
                    if (!isInitial && navigationType === "POP" && pathnameChanged) {
                        return;
                    }
                    window.scrollTo(0, 0);
                };
                waitForAnchor();
                return;
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
