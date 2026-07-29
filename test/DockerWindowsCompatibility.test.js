import assert from "node:assert/strict";
import fs from "node:fs";

describe("Docker Windows checkout compatibility", () => {
  it("forces executable shell scripts to use Linux LF line endings", () => {
    const attributes = fs.readFileSync(".gitattributes", "utf8");
    const entrypoint = fs.readFileSync("docker/frontend-entrypoint.sh");

    assert.match(attributes, /^\*\.sh text eol=lf$/mu);
    assert.equal(entrypoint.includes(13), false);
  });

  it("normalizes the frontend entrypoint again while building the image", () => {
    const dockerfile = fs.readFileSync("docker/frontend.Dockerfile", "utf8");

    assert.ok(dockerfile.includes("sed -i 's/\\r$//'"));
    assert.match(
      dockerfile,
      /chmod 755 \/usr\/local\/bin\/pramaan-frontend-entrypoint/u,
    );
  });
});
