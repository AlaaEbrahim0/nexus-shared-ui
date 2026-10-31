import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CreatePostModal } from "./CreatePostModal";
import { postDraftKey } from "../../utils/postComposerConfig";

const uploadResult = {
    url: "https://res.cloudinary.com/demo/posts/photo.jpg",
    type: "image",
};

const immediateUpload = jest.fn();

const renderModal = (props = {}) => {
    const onClose = props.onClose || jest.fn();
    const onCreate = props.onCreate || jest.fn().mockResolvedValue(undefined);
    const utils = render(
        <CreatePostModal
            isVisible
            onClose={onClose}
            onCreate={onCreate}
            onUploadMedia={props.onUploadMedia || immediateUpload}
            {...props}
        />
    );
    return { ...utils, onClose, onCreate };
};

const typeContent = (value) =>
    fireEvent.change(screen.getByLabelText(/post content/i), {
        target: { value },
    });

const chooseCategory = (name = "Clinical Case") =>
    fireEvent.click(screen.getByRole("radio", { name }));

const addTag = (query, tag) => {
    const input = screen.getByRole("combobox", { name: /tags/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: query } });
    fireEvent.click(screen.getByRole("option", { name: tag }));
};

beforeEach(() => {
    window.localStorage.clear();
    // CRA's Jest config enables resetMocks, which strips implementations
    // declared at module scope before each test.
    immediateUpload.mockResolvedValue(uploadResult);
    global.URL.createObjectURL = jest.fn(() => "blob:preview");
    global.URL.revokeObjectURL = jest.fn();
});

describe("CreatePostModal", () => {
    it("keeps Publish disabled until content and a category exist", () => {
        renderModal();
        const publish = screen.getByRole("button", { name: /^publish$/i });

        expect(publish).toBeDisabled();
        expect(
            screen.getByLabelText(/title \(optional\)/i)
        ).not.toBeRequired();

        fireEvent.change(screen.getByLabelText(/title \(optional\)/i), {
            target: { value: "A title" },
        });
        typeContent("Post body");
        expect(publish).toBeDisabled();

        chooseCategory();
        expect(publish).toBeEnabled();
    });

    it("offers exactly the five fixed categories as a single selection", () => {
        renderModal();
        const categories = screen.getAllByRole("radio");

        expect(categories.map((radio) => radio.value)).toEqual([
            "Clinical Case",
            "General Discussion",
            "Medical News",
            "Patient Care",
            "Platform Feedback",
        ]);

        chooseCategory("Medical News");
        expect(
            screen.getByRole("radio", { name: "Medical News" })
        ).toBeChecked();
        expect(
            screen.getByRole("radio", { name: "Clinical Case" })
        ).not.toBeChecked();
    });

    it("adds and removes tag chips from the standard vocabulary", () => {
        renderModal();
        addTag("anx", "Anxiety");

        expect(
            screen.getByRole("button", { name: /remove anxiety tag/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("combobox", { name: /tags/i })
        ).toHaveValue("");

        fireEvent.click(
            screen.getByRole("button", { name: /remove anxiety tag/i })
        );
        expect(
            screen.queryByRole("button", { name: /remove anxiety tag/i })
        ).not.toBeInTheDocument();
    });

    it("keeps tags limited to the suggestion list when typing free text", () => {
        renderModal();
        const input = screen.getByRole("combobox", { name: /tags/i });

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "Custom tag" } });

        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        fireEvent.keyDown(input, { key: "Enter" });
        expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
    });

    it("wraps the selected text with markdown from the toolbar", async () => {
        renderModal();
        const editor = screen.getByLabelText(/post content/i);

        typeContent("hello world");
        editor.setSelectionRange(0, 5);
        fireEvent.click(screen.getByRole("button", { name: /bold/i }));

        await waitFor(() => expect(editor).toHaveValue("**hello** world"));
    });

    it("shows a live character counter next to the editor", () => {
        renderModal();
        typeContent("abc");

        expect(screen.getByText("3 / 2,000")).toBeInTheDocument();
    });

    it("reports upload progress and keeps a removable thumbnail", async () => {
        let reportProgress;
        let finishUpload;
        const onUploadMedia = jest.fn(
            (file, onProgress) =>
                new Promise((resolve) => {
                    reportProgress = onProgress;
                    finishUpload = resolve;
                })
        );
        renderModal({ onUploadMedia });

        const file = new File(["pixels"], "photo.jpg", {
            type: "image/jpeg",
        });
        fireEvent.change(screen.getByLabelText(/drag and drop media/i), {
            target: { files: [file] },
        });

        const progress = await screen.findByRole("progressbar", {
            name: /uploading photo.jpg/i,
        });

        act(() => reportProgress(42));
        expect(progress).toHaveAttribute("aria-valuenow", "42");

        await act(async () => {
            finishUpload({
                url: "https://res.cloudinary.com/demo/posts/photo.jpg",
                type: "image",
            });
        });

        await waitFor(() =>
            expect(
                screen.queryByRole("progressbar")
            ).not.toBeInTheDocument()
        );

        const remove = screen.getByRole("button", {
            name: /remove photo.jpg/i,
        });
        fireEvent.click(remove);
        expect(screen.queryByRole("list", { name: /attached media/i })).toBeNull();
    });

    it("blocks publishing while an upload is still running", async () => {
        const onUploadMedia = jest.fn(() => new Promise(() => {}));
        renderModal({ onUploadMedia });

        typeContent("Body");
        chooseCategory();
        fireEvent.change(screen.getByLabelText(/drag and drop media/i), {
            target: {
                files: [
                    new File(["pixels"], "photo.png", { type: "image/png" }),
                ],
            },
        });

        expect(
            screen.getByRole("button", { name: /^publish$/i })
        ).toBeDisabled();
    });

    it("publishes the structured payload with audience, anonymity and media", async () => {
        const { onCreate, onClose } = renderModal({
            canPostDoctorsOnly: true,
            currentUserId: "user-1",
        });

        fireEvent.change(screen.getByLabelText(/title \(optional\)/i), {
            target: { value: "  Case notes  " },
        });
        typeContent("Body of the post");
        chooseCategory("Patient Care");
        addTag("dep", "Depression");
        fireEvent.change(screen.getByLabelText(/audience/i), {
            target: { value: "DoctorsOnly" },
        });
        fireEvent.click(screen.getByRole("switch", { name: /anonymous/i }));

        fireEvent.change(screen.getByLabelText(/drag and drop media/i), {
            target: {
                files: [
                    new File(["pixels"], "photo.jpg", { type: "image/jpeg" }),
                ],
            },
        });

        await waitFor(() =>
            expect(
                screen.queryByRole("progressbar")
            ).not.toBeInTheDocument()
        );
        expect(
            screen.getByRole("button", { name: /remove photo.jpg/i })
        ).toBeInTheDocument();
        expect(screen.queryByText(/upload failed/i)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));

        await waitFor(() =>
            expect(onCreate).toHaveBeenCalledWith({
                title: "Case notes",
                content: "Body of the post",
                category: "Patient Care",
                tags: ["Depression"],
                media: [
                    {
                        url: "https://res.cloudinary.com/demo/posts/photo.jpg",
                        type: "image",
                    },
                ],
                visibility: "DoctorsOnly",
                targetGroupId: null,
                isAnonymous: true,
            },
            null
        )
        );
        expect(onClose).toHaveBeenCalled();
    });

    it("publishes without a title", async () => {
        const { onCreate } = renderModal();

        typeContent("A short update");
        chooseCategory("General Discussion");
        fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));

        await waitFor(() =>
            expect(onCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "",
                    content: "A short update",
                }),
                null
            )
        );
    });

    it("disables unavailable audiences where appropriate", () => {
        renderModal({ canPostDoctorsOnly: false });
        const audience = screen.getByLabelText(/audience/i);

        expect(
            within(audience).getByRole("option", { name: /doctors only/i })
        ).toBeDisabled();
        expect(
            within(audience).getByRole("option", { name: /specific group/i })
        ).toBeDisabled();
    });

    it("saves a draft locally and restores it the next time it opens", () => {
        const { unmount } = renderModal({ currentUserId: "user-1" });

        fireEvent.change(screen.getByLabelText(/title \(optional\)/i), {
            target: { value: "Draft title" },
        });
        typeContent("Draft body");
        chooseCategory("Medical News");
        fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

        expect(
            window.localStorage.getItem(postDraftKey("user-1"))
        ).toContain("Draft title");
        expect(screen.getByText(/draft saved on this device/i)).toBeInTheDocument();

        unmount();
        renderModal({ currentUserId: "user-1" });

        expect(
            screen.getByText(/restored an unpublished draft/i)
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/title \(optional\)/i)).toHaveValue(
            "Draft title"
        );
        expect(screen.getByLabelText(/post content/i)).toHaveValue(
            "Draft body"
        );
        expect(
            screen.getByRole("radio", { name: "Medical News" })
        ).toBeChecked();
    });

    it("discards a restored draft", () => {
        const { unmount } = renderModal({ currentUserId: "user-1" });
        typeContent("Draft body");
        fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
        unmount();
        renderModal({ currentUserId: "user-1" });

        fireEvent.click(screen.getByRole("button", { name: /discard draft/i }));

        expect(
            window.localStorage.getItem(postDraftKey("user-1"))
        ).toBeNull();
        expect(screen.getByLabelText(/post content/i)).toHaveValue("");
    });

    it("requires a group before publishing to the specific audience", async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        renderModal({
            onCreate,
            groups: [{ id: 7, label: "Anxiety support" }],
        });

        fireEvent.change(screen.getByLabelText(/audience/i), {
            target: { value: "SpecificGroup" },
        });
        typeContent("A group update");
        chooseCategory("General Discussion");

        const publish = screen.getByRole("button", { name: /^publish$/i });
        expect(publish).toBeDisabled();
        expect(screen.getByLabelText(/^group/i)).toHaveValue("");

        fireEvent.change(screen.getByLabelText(/^group/i), {
            target: { value: "7" },
        });
        expect(publish).toBeEnabled();

        fireEvent.click(publish);
        await waitFor(() =>
            expect(onCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    visibility: "SpecificGroup",
                    targetGroupId: 7,
                }),
                null
            )
        );
    });

    it("saves a draft to the account and reuses its id", async () => {
        const onSaveDraft = jest.fn().mockResolvedValue({ id: 42 });
        renderModal({ onSaveDraft, currentUserId: "user-1" });

        typeContent("Server draft body");
        fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

        await waitFor(() =>
            expect(onSaveDraft).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: "Server draft body",
                    targetGroupId: null,
                }),
                null
            )
        );
        await waitFor(() =>
            expect(
                screen.getByText(/draft saved to your account/i)
            ).toBeInTheDocument()
        );

        fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
        await waitFor(() =>
            expect(onSaveDraft).toHaveBeenLastCalledWith(
                expect.objectContaining({ content: "Server draft body" }),
                42
            )
        );
    });

    it("removes an uploaded asset through the cleanup callback", () => {
        const onDeleteMedia = jest.fn();
        renderModal({
            onDeleteMedia,
            initialDraft: {
                id: 5,
                title: "",
                content: "Draft",
                category: "General Discussion",
                tags: "",
                visibility: "Public",
                targetGroupId: null,
                isAnonymous: false,
                media: [uploadResult],
            },
        });

        fireEvent.click(screen.getByRole("button", { name: /remove saved image/i }));

        expect(onDeleteMedia).toHaveBeenCalledWith(uploadResult.url);
    });

    it("closes on Escape while idle but not while publishing", () => {
        const { onClose, unmount } = renderModal();

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(1);

        unmount();
        const loadingRender = renderModal({ loading: true });
        fireEvent.keyDown(document, { key: "Escape" });
        expect(loadingRender.onClose).not.toHaveBeenCalled();
    });

    it("keeps the modal open when publishing fails", async () => {
        const onCreate = jest.fn().mockRejectedValue(new Error("offline"));
        const { onClose } = renderModal({ onCreate });

        typeContent("Body");
        chooseCategory();
        fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));

        await waitFor(() => expect(onCreate).toHaveBeenCalled());
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByLabelText(/post content/i)).toHaveValue("Body");
    });
});
