# 05 — Realtime sync

## Goal

Control surface mutations appear on the display within ~200ms without manual refresh. Reconnection is automatic and visible.

## Scope

**In:**
- Supabase Realtime channel subscription on `/display/[matchId]` for `toss` and `match` row changes
- Re-derive view model on every change
- Connection-state wiring to the `<ConnectionDot>` from plan 02
- Reconnect logic with backoff
- Brief client-side refetch on resubscribe to catch missed events

**Out:**
- Optimistic UI on the control side (control just writes and trusts; it can read the new state back)
- Presence (which devices are watching) — not needed for MVP
- Conflict resolution beyond "last write wins"

## Concrete steps

1. **Enable replication**
   - In Supabase, enable Realtime on `toss`, `inning`, `match` tables (publication membership).
   - Verify via MCP `list_tables` or dashboard.

2. **Client subscription**
   - `src/components/display/LiveMatch.tsx` — client component, takes initial server-rendered state as a prop.
   - Subscribes to channels:
     - `postgres_changes` on `toss` filtered by `inning_id in (...)` — but filter on `match_id` is awkward across the join. Simpler: subscribe to all toss inserts/deletes for the match's inning ids, refreshed when a new inning is created.
     - `postgres_changes` on `match` filtered by `id=eq.{matchId}`.
   - On any event: refetch the canonical slice (innings + tosses) and re-derive.

3. **Refactor display page**
   - Server component still does the initial fetch and hands off to `<LiveMatch>`.
   - Scoreboard becomes a child of `LiveMatch`, fed by client state.

4. **Connection state**
   - Track channel `status` events: `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`.
   - Map to `live | reconnecting | offline` and feed `<ConnectionDot>`.

5. **Backoff + recovery**
   - On disconnect, attempt reconnect with exponential backoff (1s → 2s → 5s → 10s, capped).
   - On reconnect, refetch slice (don't trust diff replay alone).

6. **Smoke test**
   - Two browsers: display in one, control in another. Tossing on control updates display within a second.

## Exit criteria

- Tossing from `/control/[matchId]` updates `/display/[matchId]` without refresh, observed on two devices.
- Killing wifi on the display device shows `offline`; restoring shows `reconnecting` → `live` and the score is correct after reconnect.
- No duplicated tosses or lost state after a forced disconnect during a toss.

## Notes

- The cheapest correct design: on any postgres_changes event, refetch the full match slice. Don't try to apply diffs. The slice is small.
- If Realtime feels flaky, a 10s polling fallback when status != `live` is a safe belt-and-suspenders.
- Don't subscribe on the control page — it already has the truth because it just wrote it.
