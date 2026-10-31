import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UpdatePostModal } from "./UpdatePostModal";

const initialData = {
    id: 7,
    title: "Original title",
    content: "Original body",
    category: "Clinical Case",
    tags: "Anxiety,Depression",
    visibility: "Public",
    targetGroupId: null,
    isAnonymous: false,
    media: [{ url: "https://res.cloudinary.com/demo/a.jpg", type: "image" }],
};

const renderModal = (props = {}) => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    render(
        <UpdatePostModal
            isVisible
            onClose={onClose}
            onUpdate={onUpdate}
            initialData={initialData}
            {...props}
        />
    );
    return { onUpdate, onClose };
};

describe("UpdatePostModal", () => {
    it("prepopulates every editable field and saves the complete payload", async () => {
        const { onUpdate } = renderModal();

        expect(screen.getByDisplayValue("Original title")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Original body")).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Clinical Case" })).toBeChecked();
        expect(screen.getByRole("button", { name: "Anxiety" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Depression" })).toHaveAttribute("aria-pressed", "true");

        fireEvent.change(screen.getByDisplayValue("Original body"), {
            target: { value: "Updated body" },
        });
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(7, expect.objectContaining({
            title: "Original title",
            content: "Updated body",
            category: "Clinical Case",
            tags: ["Anxiety", "Depression"],
            visibility: "Public",
            targetGroupId: null,
            isAnonymous: false,
            media: [initialData.media[0]],
        })));
    });

    it("removes existing media from the submitted list without deleting it early", async () => {
        const { onUpdate } = renderModal();
        const onDeleteMedia = jest.fn();
        fireEvent.click(screen.getByLabelText("Remove media"));
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(7, expect.objectContaining({ media: [] })));
        expect(onDeleteMedia).not.toHaveBeenCalled();
    });

    it("requires a target group when the specific audience is selected", () => {
        renderModal({
            groups: [{ id: 5, label: "Support room" }],
        });

        fireEvent.change(screen.getByDisplayValue("Public"), { target: { value: "SpecificGroup" } });
        expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
        fireEvent.change(screen.getByDisplayValue("Choose a group…"), { target: { value: "5" } });
        expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
    });
});
