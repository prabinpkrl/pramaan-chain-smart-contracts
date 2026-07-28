import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashDocument } from "../../utils/hashDocument";
import HeroVerifier from "./HeroVerifier";

vi.mock("../../utils/hashDocument", () => ({
  hashDocument: vi.fn(),
}));

const DOCUMENT_HASH = `0x${"a".repeat(64)}`;

function renderVerifier(onDigestChange = vi.fn()) {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HeroVerifier onDigestChange={onDigestChange} />} />
        <Route path="/verify/:documentHash" element={<p>Verification route</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return onDigestChange;
}

describe("HeroVerifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hashes a selected certificate locally before opening verification", async () => {
    hashDocument.mockResolvedValue(DOCUMENT_HASH);
    const onDigestChange = renderVerifier();
    const file = new File(["synthetic certificate"], "certificate.pdf", {
      type: "application/pdf",
    });

    fireEvent.click(screen.getByRole("tab", { name: "Use file" }));
    fireEvent.change(screen.getByLabelText("Certificate file"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(hashDocument).toHaveBeenCalledWith(file));
    expect(await screen.findByText(/Local fingerprint ready/)).toBeVisible();
    expect(onDigestChange).toHaveBeenLastCalledWith(DOCUMENT_HASH);

    fireEvent.click(screen.getByRole("button", { name: /Check this proof/ }));
    expect(await screen.findByText("Verification route")).toBeVisible();
  });

  it("validates pasted hashes before enabling the registry check", () => {
    renderVerifier();
    expect(screen.getByRole("tab", { name: "Paste hash" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const input = screen.getByLabelText("SHA-256 document hash");

    fireEvent.change(input, { target: { value: "0x1234" } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter 0x followed by 64 hexadecimal characters.",
    );
    expect(screen.getByRole("button", { name: /Check this proof/ })).toBeDisabled();

    fireEvent.change(input, { target: { value: DOCUMENT_HASH } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Check this proof/ })).toBeEnabled();
  });
});
