import { fireEvent, render, screen } from "@testing-library/react";
import { MediaGallery } from "./MediaGallery";

const images = [
    { url: "https://res.cloudinary.com/demo/a.jpg", type: "image" },
    { url: "https://res.cloudinary.com/demo/b.jpg", type: "image" },
];

describe("MediaGallery", () => {
    it("renders a single image without carousel chrome", () => {
        render(<MediaGallery media={[images[0]]} />);

        expect(screen.getByAltText("Post attachment 1 of 1")).toBeInTheDocument();
        expect(screen.queryByLabelText("Next media")).not.toBeInTheDocument();
    });

    it("moves through multiple media and reports the position", () => {
        render(<MediaGallery media={images} />);

        expect(screen.getByText("1 of 2")).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText("Next media"));
        expect(screen.getByText("2 of 2")).toBeInTheDocument();
        expect(screen.getByLabelText("Previous media")).toBeEnabled();
    });

    it("renders video controls and keeps a single video direct", () => {
        render(<MediaGallery media={[{ url: "https://res.cloudinary.com/demo/a.mp4", type: "video" }]} />);

        const video = screen.getByLabelText("Video 1 of 1");
        expect(video).toHaveAttribute("controls");
        expect(video).toHaveAttribute("src", "https://res.cloudinary.com/demo/a.mp4");
    });

    it("offers a fallback link when an image fails", () => {
        render(<MediaGallery media={[images[0]]} />);
        fireEvent.error(screen.getByAltText("Post attachment 1 of 1"));

        expect(screen.getByText("This media could not be loaded.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open media" })).toHaveAttribute("href", images[0].url);
    });
});
