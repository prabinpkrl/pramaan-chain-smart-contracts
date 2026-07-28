import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("exposes its busy state and prevents interaction while loading", () => {
    render(<Button loading>Issue certificate</Button>);

    const button = screen.getByRole("button", { name: "Please wait..." });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
