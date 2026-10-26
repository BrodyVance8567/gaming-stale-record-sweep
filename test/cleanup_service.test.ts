import assert from "node:assert/strict";
import { staleAssetIds, sweepRequest } from "../src/cleanup_service.js";

const parsed = sweepRequest.parse({
  playerId: "p-42",
  assetIds: ["skin-1", "skin-2"],
  liveEventIds: ["event-7"],
  moderationQueue: "game-moderation",
  staleBefore: "2025-01-01T00:00:00Z"
});

assert.deepEqual(staleAssetIds(parsed, new Date("2025-02-01T00:00:00Z")), ["skin-1", "skin-2"]);
assert.deepEqual(staleAssetIds(parsed, new Date("2024-12-01T00:00:00Z")), []);
console.log("cleanup decision test passed");
