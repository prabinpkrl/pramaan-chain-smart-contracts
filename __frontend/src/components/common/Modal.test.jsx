import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

describe("Modal", () => {
  it("labels the dialog, moves focus inside, and closes on Escape", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose} title="Confirm transaction">
        <button type="button">Confirm</button>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Confirm transaction" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
