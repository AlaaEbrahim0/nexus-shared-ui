/**
 * Vocabulary and limits shared by the post composer and the edit modal.
 *
 * These values mirror the API's PostTaxonomy and PostMediaCodec. The server
 * remains authoritative: this module only keeps the UI from offering values
 * the API would reject.
 */

export const POST_CATEGORIES = [
    "Clinical Case",
    "General Discussion",
    "Medical News",
    "Patient Care",
    "Platform Feedback",
];

export const POST_TAGS = [
    "Anxiety",
    "Depression",
    "Stress",
    "Sleep",
    "Relationships",
    "Family",
    "Therapy",
    "Medication",
    "Coping",
    "Mindfulness",
    "Self-Care",
    "Trauma",
    "Grief",
    "ADHD",
    "Autism",
    "Bipolar Disorder",
    "OCD",
    "PTSD",
    "Neurology",
    "Nutrition",
    "Exercise",
    "Students",
    "Workplace",
    "Research",
    "Support",
    "Community",
];

export const POST_MAX_TAGS = 5;
export const POST_TITLE_MAX_LENGTH = 160;
export const POST_CONTENT_MAX_LENGTH = 2000;
export const POST_MAX_IMAGES = 4;
export const POST_MAX_VIDEOS = 1;
export const POST_MAX_MEDIA = POST_MAX_IMAGES + POST_MAX_VIDEOS;
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const POST_VIDEO_MAX_BYTES = 20 * 1024 * 1024;

export const POST_VISIBILITY = {
    PUBLIC: "Public",
    DOCTORS_ONLY: "DoctorsOnly",
    SPECIFIC_GROUP: "SpecificGroup",
};

export const POST_VISIBILITY_OPTIONS = [
    { value: POST_VISIBILITY.PUBLIC, label: "Public" },
    { value: POST_VISIBILITY.DOCTORS_ONLY, label: "Doctors Only" },
    { value: POST_VISIBILITY.SPECIFIC_GROUP, label: "Specific Group" },
];

export const POST_DRAFT_VERSION = 1;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];

export const getMediaKind = (file) => {
    if (!file) return null;
    const contentType = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();

    if (
        contentType.startsWith("video/") ||
        VIDEO_EXTENSIONS.some((extension) => name.endsWith(extension))
    ) {
        return "video";
    }
    if (
        contentType.startsWith("image/") ||
        IMAGE_EXTENSIONS.some((extension) => name.endsWith(extension))
    ) {
        return "image";
    }
    return null;
};

export const mediaFileError = (file) => {
    const kind = getMediaKind(file);
    if (!kind) {
        return "Only JPG, PNG, GIF, WebP images and MP4, WebM or MOV videos can be added.";
    }
    const limit =
        kind === "video" ? POST_VIDEO_MAX_BYTES : POST_IMAGE_MAX_BYTES;
    if (file.size > limit) {
        return `${kind === "video" ? "Videos" : "Images"} must be smaller than ${
            limit / (1024 * 1024)
        } MB.`;
    }
    return null;
};

/** Checks a new file against the items already attached. */
export const mediaLimitError = (attachedKinds, nextKind) => {
    const kinds = attachedKinds || [];
    if (kinds.length >= POST_MAX_MEDIA) {
        return `You can attach up to ${POST_MAX_MEDIA} media items.`;
    }
    if (
        nextKind === "video" &&
        kinds.filter((kind) => kind === "video").length >= POST_MAX_VIDEOS
    ) {
        return "You can attach one video per post.";
    }
    if (
        nextKind === "image" &&
        kinds.filter((kind) => kind === "image").length >= POST_MAX_IMAGES
    ) {
        return `You can attach up to ${POST_MAX_IMAGES} images.`;
    }
    return null;
};

export const filterTagSuggestions = (query, selectedTags = []) => {
    const needle = (query || "").trim().toLowerCase();
    return POST_TAGS.filter(
        (tag) =>
            !selectedTags.includes(tag) &&
            (needle === "" || tag.toLowerCase().includes(needle))
    );
};

export const postDraftKey = (userId) =>
    `nexus.postDraft.${userId || "anonymous"}`;

const sanitizeMedia = (media) => {
    if (!Array.isArray(media)) return [];

    const seen = new Set();
    const items = [];
    let images = 0;
    let videos = 0;

    for (const item of media) {
        const url = typeof item?.url === "string" ? item.url.trim() : "";
        const type = item?.type === "video" ? "video" : "image";

        if (
            !url.startsWith("https://") ||
            seen.has(url) ||
            (type === "video" ? videos >= POST_MAX_VIDEOS : images >= POST_MAX_IMAGES)
        ) {
            continue;
        }

        seen.add(url);
        if (type === "video") videos += 1;
        else images += 1;
        items.push({ url, type });
    }

    return items;
};

/**
 * Reads a draft written by writePostDraft. Anything malformed, stale or
 * outside the vocabulary is dropped rather than trusted, because localStorage
 * is user-editable and can survive a deployment with a different taxonomy.
 */
export const readPostDraft = (storage, key) => {
    if (!storage || !key) return null;

    let parsed;
    try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (!parsed || parsed.version !== POST_DRAFT_VERSION) return null;

    const title =
        typeof parsed.title === "string"
            ? parsed.title.slice(0, POST_TITLE_MAX_LENGTH)
            : "";
    const content =
        typeof parsed.content === "string"
            ? parsed.content.slice(0, POST_CONTENT_MAX_LENGTH)
            : "";
    const category = POST_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "";
    const tags = Array.isArray(parsed.tags)
        ? parsed.tags
              .filter(
                  (tag, index, all) =>
                      POST_TAGS.includes(tag) && all.indexOf(tag) === index
              )
              .slice(0, POST_MAX_TAGS)
        : [];
    const visibility = [
        POST_VISIBILITY.DOCTORS_ONLY,
        POST_VISIBILITY.SPECIFIC_GROUP,
    ].includes(parsed.visibility)
        ? parsed.visibility
        : POST_VISIBILITY.PUBLIC;
    const targetGroupId =
        visibility === POST_VISIBILITY.SPECIFIC_GROUP &&
        Number.isInteger(parsed.targetGroupId) &&
        parsed.targetGroupId > 0
            ? parsed.targetGroupId
            : null;
    const media = sanitizeMedia(parsed.media);
    const isAnonymous = parsed.isAnonymous === true;

    if (
        !title.trim() &&
        !content.trim() &&
        !category &&
        tags.length === 0 &&
        media.length === 0 &&
        !isAnonymous
    ) {
        return null;
    }

    return {
        title,
        content,
        category,
        tags,
        visibility,
        targetGroupId,
        isAnonymous,
        media,
    };
};

export const writePostDraft = (storage, key, draft) => {
    if (!storage || !key) return false;
    try {
        storage.setItem(
            key,
            JSON.stringify({ version: POST_DRAFT_VERSION, ...draft })
        );
        return true;
    } catch {
        return false;
    }
};

export const clearPostDraft = (storage, key) => {
    if (!storage || !key) return;
    try {
        storage.removeItem(key);
    } catch {
        // Storage can be unavailable in private browsing; ignoring is safe.
    }
};
