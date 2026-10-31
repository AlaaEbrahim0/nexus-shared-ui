import { useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiImage, FiVideo } from "react-icons/fi";

const normalise = (items) =>
    (Array.isArray(items) ? items : [])
        .filter((item) => item && typeof item.url === "string" && item.url)
        .map((item) => ({
            url: item.url,
            type: item.type === "video" ? "video" : "image",
        }));

const MediaFrame = ({ item, index, total }) => {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100 px-4 text-center text-sm text-neutral-600">
                {item.type === "video" ? <FiVideo aria-hidden="true" className="text-2xl" /> : <FiImage aria-hidden="true" className="text-2xl" />}
                <span>This media could not be loaded.</span>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary-800 underline">
                    Open media
                </a>
            </div>
        );
    }

    if (item.type === "video") {
        return (
            <video
                src={item.url}
                controls
                playsInline
                preload="metadata"
                aria-label={`Video ${index + 1} of ${total}`}
                onError={() => setFailed(true)}
                className="max-h-[32rem] w-full rounded-xl border border-neutral-200 bg-black object-contain"
            >
                Your browser cannot play this video.
            </video>
        );
    }

    return (
        <img
            src={item.url}
            alt={`Post attachment ${index + 1} of ${total}`}
            loading="lazy"
            onError={() => setFailed(true)}
            className="max-h-[32rem] w-full rounded-xl border border-neutral-200 bg-neutral-50 object-contain"
        />
    );
};

/**
 * A small, dependency-free post media viewer. Multiple items use native
 * scroll-snap so touch swipe, trackpad and keyboard navigation share one
 * implementation; a single item is presented directly without carousel chrome.
 */
export const MediaGallery = ({ media, className = "" }) => {
    const items = normalise(media);
    const [index, setIndex] = useState(0);
    const trackRef = useRef(null);

    if (items.length === 0) return null;

    if (items.length === 1) {
        return (
            <div className={className}>
                <MediaFrame item={items[0]} index={0} total={1} />
            </div>
        );
    }

    const goTo = (nextIndex) => {
        const safeIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
        const track = trackRef.current;
        if (track) {
            track.scrollTo({ left: safeIndex * track.clientWidth, behavior: "smooth" });
        }
        setIndex(safeIndex);
    };

    const handleScroll = () => {
        const track = trackRef.current;
        if (!track?.clientWidth) return;
        const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
        setIndex(Math.max(0, Math.min(items.length - 1, nextIndex)));
    };

    const handleKeyDown = (event) => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            goTo(index - 1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            goTo(index + 1);
        }
    };

    return (
        <div className={`relative min-w-0 ${className}`}>
            <div
                ref={trackRef}
                role="group"
                aria-roledescription="carousel"
                aria-label={`Post media, ${items.length} items`}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                className="flex snap-x snap-mandatory overflow-x-auto rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
            >
                {items.map((item, itemIndex) => (
                    <div
                        key={`${item.url}-${itemIndex}`}
                        className="w-full shrink-0 snap-center pr-0"
                        aria-hidden={itemIndex !== index}
                    >
                        <MediaFrame item={item} index={itemIndex} total={items.length} />
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                aria-label="Previous media"
                className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-neutral-200 bg-white/95 text-neutral-800 shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:pointer-events-none disabled:opacity-40"
            >
                <FiChevronLeft aria-hidden="true" className="text-xl" />
            </button>
            <button
                type="button"
                onClick={() => goTo(index + 1)}
                disabled={index === items.length - 1}
                aria-label="Next media"
                className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-neutral-200 bg-white/95 text-neutral-800 shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:pointer-events-none disabled:opacity-40"
            >
                <FiChevronRight aria-hidden="true" className="text-xl" />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white">
                {index + 1} of {items.length}
            </span>
        </div>
    );
};
