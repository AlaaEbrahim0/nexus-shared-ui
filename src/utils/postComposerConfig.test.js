import {
    POST_MAX_TAGS,
    POST_VISIBILITY,
    clearPostDraft,
    filterTagSuggestions,
    getMediaKind,
    mediaFileError,
    mediaLimitError,
    postDraftKey,
    readPostDraft,
    writePostDraft,
} from "./postComposerConfig";

const memoryStorage = () => {
    const values = new Map();
    return {
        getItem: (key) => (values.has(key) ? values.get(key) : null),
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
    };
};

describe("post composer limits", () => {
    it("recognises media kinds by content type or extension", () => {
        expect(getMediaKind({ name: "a.JPG", type: "" })).toBe("image");
        expect(getMediaKind({ name: "a.mp4", type: "video/mp4" })).toBe(
            "video"
        );
        expect(getMediaKind({ name: "notes.txt", type: "text/plain" })).toBe(
            null
        );
    });

    it("rejects oversized files with the matching message", () => {
        expect(
            mediaFileError({
                name: "big.png",
                type: "image/png",
                size: 6 * 1024 * 1024,
            })
        ).toMatch(/smaller than 5 MB/);
        expect(
            mediaFileError({
                name: "clip.mp4",
                type: "video/mp4",
                size: 21 * 1024 * 1024,
            })
        ).toMatch(/smaller than 20 MB/);
    });

    it("caps images, videos and the total attachment count", () => {
        expect(
            mediaLimitError(["image", "image", "image", "image"], "image")
        ).toMatch(/up to 4 images/);
        expect(mediaLimitError(["video"], "video")).toMatch(/one video/);
        expect(
            mediaLimitError(["image", "video"], "image")
        ).toBeNull();
    });
});

describe("tag suggestions", () => {
    it("filters by substring and hides selected tags", () => {
        expect(
            filterTagSuggestions("anx", [])
        ).toEqual(["Anxiety"]);
        expect(
            filterTagSuggestions("", ["Anxiety"])
        ).not.toContain("Anxiety");
    });
});

describe("post drafts", () => {
    it("round-trips a draft through storage", () => {
        const storage = memoryStorage();
        const key = postDraftKey("user-1");

        expect(
            writePostDraft(storage, key, {
                title: "A draft",
                content: "Still thinking",
                category: "Clinical Case",
                tags: ["Anxiety"],
                visibility: POST_VISIBILITY.DOCTORS_ONLY,
                isAnonymous: true,
                media: [
                    {
                        url: "https://res.cloudinary.com/demo/a.jpg",
                        type: "image",
                    },
                ],
            })
        ).toBe(true);

        expect(readPostDraft(storage, key)).toEqual({
            title: "A draft",
            content: "Still thinking",
            category: "Clinical Case",
            tags: ["Anxiety"],
            visibility: POST_VISIBILITY.DOCTORS_ONLY,
            targetGroupId: null,
            isAnonymous: true,
            media: [
                { url: "https://res.cloudinary.com/demo/a.jpg", type: "image" },
            ],
        });
    });

    it("drops values the API would reject", () => {
        const storage = memoryStorage();
        const key = postDraftKey();
        storage.setItem(
            key,
            JSON.stringify({
                version: 1,
                title: "Draft",
                content: "",
                category: "Free text",
                tags: ["Anxiety", "NotATag", "Anxiety"],
                visibility: "Everyone",
                isAnonymous: false,
                media: [
                    { url: "http://insecure.example/a.jpg", type: "image" },
                    {
                        url: "https://res.cloudinary.com/demo/b.jpg",
                        type: "image",
                    },
                ],
            })
        );

        expect(readPostDraft(storage, key)).toEqual({
            title: "Draft",
            content: "",
            category: "",
            tags: ["Anxiety"],
            visibility: POST_VISIBILITY.PUBLIC,
            targetGroupId: null,
            isAnonymous: false,
            media: [
                {
                    url: "https://res.cloudinary.com/demo/b.jpg",
                    type: "image",
                },
            ],
        });
    });

    it("returns null for empty, malformed or unknown-version drafts", () => {
        const storage = memoryStorage();
        const key = postDraftKey();

        expect(readPostDraft(storage, key)).toBeNull();

        storage.setItem(key, "{not json");
        expect(readPostDraft(storage, key)).toBeNull();

        storage.setItem(key, JSON.stringify({ version: 99, title: "Old" }));
        expect(readPostDraft(storage, key)).toBeNull();

        storage.setItem(
            key,
            JSON.stringify({ version: 1, title: "  ", content: "" })
        );
        expect(readPostDraft(storage, key)).toBeNull();
    });

    it("caps restored tags at the selection limit", () => {
        const storage = memoryStorage();
        const key = postDraftKey();
        storage.setItem(
            key,
            JSON.stringify({
                version: 1,
                tags: [
                    "Anxiety",
                    "Depression",
                    "Stress",
                    "Sleep",
                    "Relationships",
                    "Family",
                ],
            })
        );

        expect(readPostDraft(storage, key).tags).toHaveLength(POST_MAX_TAGS);
    });

    it("clears drafts without throwing when storage is unavailable", () => {
        const failingStorage = {
            removeItem: () => {
                throw new Error("blocked");
            },
        };

        expect(() => clearPostDraft(failingStorage, "key")).not.toThrow();
        expect(writePostDraft(failingStorage, "key", {})).toBe(false);
    });
});
