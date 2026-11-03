import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AttachmentPicker } from "./AttachmentPicker";

const image = () => new File(["payload"], "photo.png", { type: "image/png" });
const video = () => new File(["payload"], "clip.mp4", { type: "video/mp4" });

const pickFile = (container, file) => {
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });
};

const renderPicker = (props = {}) => {
    const onRemoveUpload = jest.fn().mockResolvedValue({});
    const handlers = { onChange: jest.fn(), removeUpload: onRemoveUpload, ...props };
    const view = render(<AttachmentPicker {...handlers} />);

    return { ...view, ...handlers };
};

describe("AttachmentPicker", () => {
    it("offers one attach control while the comment has no media", () => {
        renderPicker();

        expect(
            screen.getByRole("button", { name: /attach an image or video/i })
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /remove attachment/i })).not.toBeInTheDocument();
    });

    it("uploads a picked image and hands the stored media to the parent", async () => {
        const upload = jest.fn().mockResolvedValue({ url: "https://cdn/photo.png", type: "image" });
        const { container, onChange } = renderPicker({ upload });

        pickFile(container, image());

        await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
        expect(upload.mock.calls[0][0].name).toBe("photo.png");
        expect(onChange).toHaveBeenCalledWith({
            url: "https://cdn/photo.png",
            type: "image",
        });
    });

    it("keeps a video attachment typed as video", async () => {
        const upload = jest.fn().mockResolvedValue({ url: "https://cdn/clip.mp4", type: "video" });
        const { container, onChange } = renderPicker({ upload });

        pickFile(container, video());

        await waitFor(() => expect(onChange).toHaveBeenCalledWith({
            url: "https://cdn/clip.mp4",
            type: "video",
        }));
    });

    it("reports upload progress and clears the status once it lands", async () => {
        let report;
        let finish;
        const upload = jest.fn(
            (file, onProgress) =>
                new Promise((resolve) => {
                    report = onProgress;
                    finish = () => resolve({ url: "https://cdn/photo.png", type: "image" });
                })
        );
        const { container } = renderPicker({ upload });

        pickFile(container, image());

        const bar = await screen.findByRole("progressbar", { name: /uploading attachment/i });

        await act(async () => report(40));
        expect(bar).toHaveAttribute("aria-valuenow", "40");

        await act(async () => finish());
        expect(
            screen.queryByRole("progressbar", { name: /uploading attachment/i })
        ).not.toBeInTheDocument();
    });

    it("refuses a file that is neither an image nor a video without uploading it", async () => {
        const upload = jest.fn();
        const { container } = renderPicker({ upload });

        pickFile(container, new File(["payload"], "notes.pdf", { type: "application/pdf" }));

        expect(await screen.findByRole("status")).toHaveTextContent(/only jpg/i);
        expect(upload).not.toHaveBeenCalled();
    });

    it("surfaces a rejected upload instead of failing silently", async () => {
        const upload = jest.fn().mockRejectedValue(new Error("Storage is full"));
        const { container } = renderPicker({ upload });

        pickFile(container, image());

        expect(await screen.findByRole("status")).toBeInTheDocument();
    });

    it("drops the attachment from the parent and deletes the unmanaged asset", async () => {
        const removeUpload = jest.fn().mockResolvedValue({});
        const onChange = jest.fn();
        renderPicker({
            value: { url: "https://cdn/photo.png", type: "image" },
            onChange,
            removeUpload,
        });

        fireEvent.click(screen.getByRole("button", { name: /remove attachment/i }));

        expect(onChange).toHaveBeenCalledWith(null);
        await waitFor(() =>
            expect(removeUpload).toHaveBeenCalledWith("https://cdn/photo.png")
        );
    });
});
