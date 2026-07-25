import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { Interface } from "ethers";
import { decodeEvent } from "../src/services/events.js";

const abi = JSON.parse(
  fs.readFileSync(new URL("../src/abi.json", import.meta.url), "utf8"),
);

test("decodeEvent returns ethers v6 log index and named arguments", () => {
  const contractInterface = new Interface(abi);
  const documentHash = `0x${"11".repeat(32)}`;
  const issuer = "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28";
  const encoded = contractInterface.encodeEventLog(
    contractInterface.getEvent("CertificateIssued"),
    [documentHash, issuer, 123n],
  );

  const event = decodeEvent({
    ...encoded,
    blockNumber: 100,
    blockHash: `0x${"22".repeat(32)}`,
    transactionHash: `0x${"33".repeat(32)}`,
    index: 7,
  }, contractInterface);

  assert.equal(event.logIndex, 7);
  assert.deepEqual(event.args, {
    documentHash,
    issuer,
    issuedAt: "123",
  });
  assert.equal("0" in event.args, false);
});
