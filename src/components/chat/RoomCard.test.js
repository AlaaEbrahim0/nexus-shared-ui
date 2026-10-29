import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RoomCard } from "./RoomCard";

const baseRoom = {
    id: 7,
    name: "Anxiety support",
    description: "A calm space for weekly check-ins.",
    visibility: "Public",
    isPrivate: false,
    requiresPassword: false,
    isLocked: false,
    isArchived: false,
    coverImageUrl: null,
    scheduledStartAtUtc: null,
    lastMessageAtUtc: "2026-10-29T10:00:00Z",
    memberCount: 12,
    isMember: false,
    ownerDisplayName: "Dana Doctor",
    ownerIsDoctor: true,
};

const renderCard = (room = {}, props = {}) =>
    render(
        <MemoryRouter>
            <RoomCard room={{ ...baseRoom, ...room }} to="/rooms/7" {...props} />
        </MemoryRouter>
    );

describe("RoomCard", () => {
    it("renders the room name, host badge and member count", () => {
        renderCard();

        expect(screen.getByRole("heading", { name: "Anxiety support" })).toBeInTheDocument();
        expect(screen.getByText("Doctor host")).toBeInTheDocument();
        expect(screen.getByText("12 members")).toBeInTheDocument();
        expect(screen.getByText("A calm space for weekly check-ins.")).toBeInTheDocument();
    });

    it("labels a patient-owned room as a patient host", () => {
        renderCard({ ownerIsDoctor: false, ownerDisplayName: "Patient AB12CD" });

        expect(screen.getByText("Patient host")).toBeInTheDocument();
    });

    it("shows a password badge only when the private room requires one", () => {
        const { rerender } = renderCard({ isPrivate: true, requiresPassword: true });
        expect(screen.getByText("Password")).toBeInTheDocument();

        rerender(
            <MemoryRouter>
                <RoomCard room={{ ...baseRoom, isPrivate: true }} to="/rooms/7" />
            </MemoryRouter>
        );
        expect(screen.getByText("Private")).toBeInTheDocument();
        expect(screen.queryByText("Password")).not.toBeInTheDocument();
    });

    it("falls back to a placeholder when there is no cover or the cover is unsafe", () => {
        const { container, rerender } = renderCard();
        expect(container.querySelector("img")).toBeNull();

        rerender(
            <MemoryRouter>
                <RoomCard
                    room={{ ...baseRoom, coverImageUrl: "javascript:alert(1)" }}
                    to="/rooms/7"
                />
            </MemoryRouter>
        );
        expect(container.querySelector("img")).toBeNull();

        rerender(
            <MemoryRouter>
                <RoomCard
                    room={{ ...baseRoom, coverImageUrl: "https://cdn.example.com/room.jpg" }}
                    to="/rooms/7"
                />
            </MemoryRouter>
        );
        const image = container.querySelector("img");
        expect(image).not.toBeNull();
        expect(image).toHaveAttribute("src", "https://cdn.example.com/room.jpg");
        expect(image).toHaveAttribute("loading", "lazy");
    });

    it("disables joining an archived or paused room", () => {
        const onJoin = jest.fn();
        const { rerender } = renderCard({ isArchived: true }, { onJoin });
        const archived = screen.getByRole("button", { name: "Archived" });
        expect(archived).toBeDisabled();
        fireEvent.click(archived);
        expect(onJoin).not.toHaveBeenCalled();

        rerender(
            <MemoryRouter>
                <RoomCard room={{ ...baseRoom, isLocked: true }} to="/rooms/7" onJoin={onJoin} />
            </MemoryRouter>
        );
        const paused = screen.getByRole("button", { name: "Paused" });
        expect(paused).toBeDisabled();
        fireEvent.click(paused);
        expect(onJoin).not.toHaveBeenCalled();
    });

    it("offers Join to a non-member and Open to a member", () => {
        const onJoin = jest.fn();
        const { rerender } = renderCard({}, { onJoin });
        fireEvent.click(screen.getByRole("button", { name: "Join" }));
        expect(onJoin).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));

        rerender(
            <MemoryRouter>
                <RoomCard room={{ ...baseRoom, isMember: true }} to="/rooms/7" onJoin={onJoin} />
            </MemoryRouter>
        );
        expect(screen.queryByRole("button", { name: "Join" })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/rooms/7");
    });

    it("makes the title link the single stretched click target", () => {
        renderCard();

        const titleLink = screen.getByRole("link", { name: "Anxiety support" });
        expect(titleLink).toHaveAttribute("href", "/rooms/7");
    });
});
