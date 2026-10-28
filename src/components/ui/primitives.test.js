import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Link } from "react-router-dom";
import {
    Alert,
    Button,
    ConfirmDialog,
    Input,
    Modal,
} from "./primitives";

describe("Button", () => {
    it("blocks interaction and announces busy state while loading", () => {
        render(
            <Button loading loadingText="Saving changes">
                Save
            </Button>
        );

        const button = screen.getByRole("button", { name: /saving changes/i });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("aria-busy", "true");
    });

    it("keeps icons and labels as direct flex children so they stay centered", () => {
        render(
            <Button>
                <svg data-testid="button-icon" />
                <span>Save profile</span>
            </Button>
        );

        const button = screen.getByRole("button", { name: /save profile/i });
        expect(button.firstElementChild).toBe(screen.getByTestId("button-icon"));
    });

    it("can render as a router link for navigation actions", () => {
        render(
            <MemoryRouter>
                <Button as={Link} to="/login" variant="outline">
                    Back to sign in
                </Button>
            </MemoryRouter>
        );

        expect(
            screen.getByRole("link", { name: /back to sign in/i })
        ).toHaveAttribute("href", "/login");
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
});

describe("Input", () => {
    it("connects the label, error, and invalid state", () => {
        render(
            <Input
                id="email"
                label="Email"
                required
                error="Enter a valid email address."
            />
        );

        const input = screen.getByLabelText(/^email$/i);
        expect(input).toBeRequired();
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAttribute("aria-describedby", "email-error");
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Enter a valid email address."
        );
    });

    it("exposes hints through aria-describedby", () => {
        render(
            <Input
                id="password"
                label="Password"
                hint="Use at least 8 characters."
            />
        );

        const input = screen.getByLabelText(/^password$/i);
        expect(input).not.toHaveAttribute("aria-invalid");
        expect(input).toHaveAttribute("aria-describedby", "password-hint");
        expect(screen.getByText("Use at least 8 characters.")).toHaveAttribute(
            "id",
            "password-hint"
        );
    });
});

describe("Modal", () => {
    const renderModal = (props = {}) =>
        render(
            <Modal
                isOpen
                onClose={() => {}}
                title="Settings"
                footer={
                    <>
                        <Button variant="outline">Cancel</Button>
                        <Button>Confirm</Button>
                    </>
                }
                {...props}
            >
                <Input id="display-name" label="Display name" />
            </Modal>
        );

    it("moves focus into the dialog and traps Tab at both ends", () => {
        renderModal();

        const close = screen.getByRole("button", { name: /close dialog/i });
        const confirm = screen.getByRole("button", { name: /^confirm$/i });

        expect(close).toHaveFocus();

        confirm.focus();
        fireEvent.keyDown(document, { key: "Tab" });
        expect(close).toHaveFocus();

        close.focus();
        fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
        expect(confirm).toHaveFocus();
    });

    it("closes on Escape and restores focus to the opener", () => {
        const opener = document.createElement("button");
        opener.textContent = "Open settings";
        document.body.appendChild(opener);
        opener.focus();

        const onClose = jest.fn();
        const { rerender } = renderModal({ onClose });

        expect(document.body.style.overflow).toBe("hidden");

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(1);

        rerender(
            <Modal isOpen={false} onClose={onClose} title="Settings">
                <p>Hidden</p>
            </Modal>
        );

        expect(opener).toHaveFocus();
        expect(document.body.style.overflow).toBe("");

        opener.remove();
    });
});

describe("ConfirmDialog", () => {
    it("awaits the confirmation and closes on success", async () => {
        const onConfirm = jest.fn().mockResolvedValue(undefined);
        const onClose = jest.fn();

        render(
            <ConfirmDialog
                isOpen
                onClose={onClose}
                onConfirm={onConfirm}
                title="Delete post"
                message="This cannot be undone."
                confirmLabel="Delete"
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

        expect(
            screen.getByRole("button", { name: /^delete$/i })
        ).toBeDisabled();
        await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it("reports failures and stays open", async () => {
        const error = new Error("Delete failed");
        const onConfirm = jest.fn().mockRejectedValue(error);
        const onError = jest.fn();
        const onClose = jest.fn();

        render(
            <ConfirmDialog
                isOpen
                onClose={onClose}
                onConfirm={onConfirm}
                onError={onError}
                title="Delete post"
                message="This cannot be undone."
                confirmLabel="Delete"
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

        await waitFor(() => expect(onError).toHaveBeenCalledWith(error));
        expect(onClose).not.toHaveBeenCalled();
    });
});

describe("Alert", () => {
    it("uses alert semantics for errors", () => {
        render(<Alert variant="error">Could not save.</Alert>);

        expect(screen.getByRole("alert")).toHaveTextContent("Could not save.");
    });
});
