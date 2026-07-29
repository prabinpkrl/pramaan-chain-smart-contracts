import { describe, expect, it } from "vitest";
import { sortEventsNewestFirst } from "./events";

describe("sortEventsNewestFirst", () => {
  it("orders higher blocks and later logs first without mutating the API response", () => {
    const events = [
      { blockNumber: 100, logIndex: 2 },
      { blockNumber: 101, logIndex: 1 },
      { blockNumber: 101, logIndex: 3 },
    ];

    expect(sortEventsNewestFirst(events)).toEqual([
      { blockNumber: 101, logIndex: 3 },
      { blockNumber: 101, logIndex: 1 },
      { blockNumber: 100, logIndex: 2 },
    ]);
    expect(events[0]).toEqual({ blockNumber: 100, logIndex: 2 });
  });
});
