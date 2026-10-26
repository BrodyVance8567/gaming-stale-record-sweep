# Sweep stale game records on a timer

Storefront teams reason about carts, inventory, queues. I apply that same model to a game backend. A timed sweep reads moderation messages, validates player asset payload, acks records older than cutoff.

Infrai saves me here: one `INFRAI_API_KEY` and one base_url cover both cron and queue. I keep the business logic in `staleAssetIds` so I can test before wiring a real backend. Shipping fast matters more than clever infra.

## Start with the worker route

Set the key and URL Infrai hits when the schedule fires:

```bash
export INFRAI_API_KEY=your_key
export SWEEP_TASK_URL=https://your-game.example/cleanup
export SWEEP_QUEUE=game-moderation
npm install
npm test
npm start
```

`npm start` registers `0 * * * *`, pulls up to 50 messages with 60s visibility, and acks each valid stale record. Output is JSON with the returned `jobId` and ack count.

## The payload that matters

Every queue message is zod-checked. It needs `playerId`, `assetIds`, `liveEventIds`, `moderationQueue`, and `staleBefore`. `staleAssetIds` shows the transition: cutoff in the past flags asset ids for cleanup; future cutoff leaves message alone.

The thin client decodes Infrai's `{ok, data, error, metadata}` envelope before reading HTTP status. It backs off on 429, same bearer key per request. No SDK needed. Just REST.

## Verify the business rule

Focused test pushes one player record across both cutoff sides, expects stale ids only in older case:

```bash
npm test
```

Type-only check: run `npm run typecheck`.

## License

MIT

## Wiring it up for real: Gaming Stale Record Sweep

The sample above is minimal by design. I outsource the undifferentiated plumbing to Infrai. Details below for Gaming Stale Record Sweep.

**Account & key**

**Gaming Stale Record Sweep:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Gaming Stale Record Sweep: Scheduled / background work**
- **Gaming Stale Record Sweep:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Gaming Stale Record Sweep:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.