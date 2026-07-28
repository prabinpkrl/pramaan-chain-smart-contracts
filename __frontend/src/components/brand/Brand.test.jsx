import "@testing-library/jest-dom/vitest";
import { render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import Brand from "./Brand";

describe("Brand", () => {
  it("uses the icon asset in compact navigation contexts", () => {
    const { container } = render(
      <MemoryRouter>
        <Brand compact />
      </MemoryRouter>,
    );

    const link = within(container).getByRole("link", { name: "PramaanChain home" });
    expect(link).toHaveAttribute("href", "/");
    expect(link.querySelector("img")).toHaveAttribute("src", "/Logo-icon.png");
    expect(link).toHaveTextContent("PramaanChain");
  });

  it("uses the complete supplied lockup for larger brand moments", () => {
    const { container } = render(
      <MemoryRouter>
        <Brand variant="full" />
      </MemoryRouter>,
    );

    const link = within(container).getByRole("link", { name: "PramaanChain home" });
    expect(link.querySelector("img")).toHaveAttribute("src", "/Logo-full.png");
    expect(link).not.toHaveTextContent("PramaanChain");
  });
});
