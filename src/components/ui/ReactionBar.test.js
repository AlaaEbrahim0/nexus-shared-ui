import { fireEvent, render, screen } from "@testing-library/react";
import { ReactionBar } from "./ReactionBar";

const REACTIONS = [
    { reaction: "love", count: 3 },
    { reaction: "like", count: 1 },
];

const renderBar = (props = {}) =>
    render(
        <ReactionBar
            reactions={REACTIONS}
            myReaction="like"
            onReact={jest.fn()}
            onRemove={jest.fn()}
            {...props}
        />
    );

const openPicker = () => {
    fireEvent.click(screen.getByRole("button", { name: /change reaction/i }));
};

describe("ReactionBar", () => {
    it("shows one chip per reaction with its count and marks the viewer's own", () => {
        renderBar();

        expect(screen.getByRole("button", { name: "Love: 3" })).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Like: 1, your reaction" })
        ).toHaveAttribute("aria-pressed", "true");
    });

    it("renders nothing for a token outside the vocabulary", () => {
        renderBar({ reactions: [{ reaction: "angry", count: 4 }] });

        expect(screen.queryByRole("button", { name: /^Angry/ })).not.toBeInTheDocument();
    });

    it("removes the chip you already reacted with and sets any other", () => {
        const onReact = jest.fn();
        const onRemove = jest.fn();
        renderBar({ onReact, onRemove });

        fireEvent.click(screen.getByRole("button", { name: "Like: 1, your reaction" }));
        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(onReact).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Love: 3" }));
        expect(onReact).toHaveBeenCalledWith("love");
    });

    it("offers the whole vocabulary in the picker and closes after a choice", () => {
        const onReact = jest.fn();
        renderBar({ onReact });

        openPicker();
        expect(screen.getByRole("menu")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("menuitem", { name: "React with Haha" }));
        expect(onReact).toHaveBeenCalledWith("haha");
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("removes through the picker when you re-pick your own reaction", () => {
        const onReact = jest.fn();
        const onRemove = jest.fn();
        renderBar({ onReact, onRemove });

        openPicker();
        fireEvent.click(screen.getByRole("menuitem", { name: "Remove Like reaction" }));

        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(onReact).not.toHaveBeenCalled();
    });

    it("closes the picker on Escape", () => {
        renderBar();

        openPicker();
        fireEvent.keyDown(document, { key: "Escape" });

        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("keeps every control out of the way while a reaction request is running", () => {
        const onReact = jest.fn();
        const onRemove = jest.fn();
        renderBar({ disabled: true, onReact, onRemove });

        fireEvent.click(screen.getByRole("button", { name: "Love: 3" }));
        fireEvent.click(screen.getByRole("button", { name: /change reaction/i }));

        expect(screen.getByRole("button", { name: "Love: 3" })).toBeDisabled();
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(onReact).not.toHaveBeenCalled();
        expect(onRemove).not.toHaveBeenCalled();
    });

    it("invites a reaction when the viewer has none", () => {
        renderBar({ reactions: [], myReaction: null });

        expect(screen.getByRole("button", { name: "Add a reaction" })).toBeInTheDocument();
    });

    it("puts the picker trigger before the count chips", () => {
        renderBar();

        expect(screen.getAllByRole("button")[0]).toHaveAccessibleName(/change reaction/i);
    });

    it("opens the picker inward when the strip sits against the card edge", () => {
        renderBar({ align: "end" });

        openPicker();
        expect(screen.getByRole("menu")).toHaveClass("right-0");
        expect(screen.getByRole("menu")).not.toHaveClass("left-0");
    });

    it("opens the picker outward by default", () => {
        renderBar();

        openPicker();
        expect(screen.getByRole("menu")).toHaveClass("left-0");
    });
});
