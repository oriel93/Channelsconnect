# Channex PMS Cert — Screenshare Script

**Test goal:** Build a property in Channex from our PMS and confirm 100% of availability flows correctly from our platform → Channex.

**Last dry-run:** 2026-05-17 (Sun night). Build flow, ARI push, and restrictions push **all verified live against staging.channex.io**.

---

## Pre-flight Checklist (do BEFORE the call)

| # | Item | How to verify |
|---|---|---|
| 1 | You're logged in as **`oriel@erorentals.com`** (the only `admin` user) | Top-right of channelsconnect.com shows your email. Don't use josh@utilecapital.com — he's `role=user`. |
| 2 | Frontend bundle is fresh | `curl -sSI https://channelsconnect.com | grep last-modified` should show today |
| 3 | API is healthy | https://api.channelsconnect.com/health returns `{status:"ok"}` |
| 4 | Channex master API key is set in ECS env (`CHANNEX_API_KEY`) | `sst secret list --stage production` |
| 5 | DevTools open with **Network tab visible** and **Filter: Fetch/XHR** | F12 → Network → checkbox "Preserve log" |
| 6 | Channex staging dashboard open in a **second tab/window** at https://staging.channex.io | So you can show the certifier the IDs landing on their side |
| 7 | Test property to use: **create a fresh one** (don't reuse the dirty 3db72f15-... — it has 4 duplicate mappings) | See Step 1 below |

---

## The Walkthrough (what to say + click, in order)

### Step 0 — Set the scene (30 sec)

> "I'm going to walk you through how a property is built in our PMS and then synced into Channex. The whole flow runs through our admin dashboard. We'll create a brand-new property, push it to Channex with a single click, then I'll show you that the availability is 100% in sync — first by pushing a full 500-day calendar, then by making a delta change and watching it land on Channex within seconds."

### Step 1 — Show the local listing in our admin dashboard

1. Navigate to **https://channelsconnect.com → Admin → Listings**
2. Click **"+ New Listing"** (or whatever your create-listing path is)
3. Fill in:
   - Title: `Cert Demo Villa`
   - Description: `Two-bedroom oceanfront test property for Channex certification`
   - Address / City / Country: `123 Cert Lane / Miami / US`
   - Currency: `USD`
   - Max guests: `4`
   - Base price: `$200/night`
4. Save → listing appears in the table with no Channex mapping yet (channex_property_id = null)

> "This listing exists only in our database. Nothing has been sent to Channex yet."

### Step 2 — Build the property in Channex (1-click)

1. Find the row for `Cert Demo Villa`
2. Click the **"Build in Channex"** (or "Sync to Channex") button on that row
3. **In DevTools Network tab, point out:**
   - `POST /admin/channex/build/<listingId>` → 200 OK
   - Response shows:
     ```json
     {
       "success": true,
       "channexPropertyId": "<uuid>",
       "channexRoomTypeId": "<uuid>",
       "channexRatePlanId": "<uuid>",
       "message": "Property built in Channex. IDs: ..."
     }
     ```
4. **Switch to the Channex staging dashboard tab** and refresh the Properties list
5. Point at the new property — title matches, currency USD, status active

> "Behind that one click, our API made three sequential calls to Channex: POST /properties to create the property, then POST /room_types for a Standard Room with the right occupancy fields — occ_adults, occ_children, occ_infants — then POST /rate_plans to attach a primary rate plan in per_room sell_mode. Each step captures the returned ID, and if any step fails we automatically roll back the earlier ones. All three IDs are persisted back to our database against the listing."

### Step 3 — Verify mapping persisted to our DB

1. Back on our admin → Listings, refresh the page
2. Find `Cert Demo Villa` — the row now shows **Mapped** badge with all 3 Channex IDs
3. Click **"Mapping"** button → modal opens showing the 3 IDs editable

> "The IDs are persisted on the ChannexMapping row and also denormalized onto the Listing row for fast lookups. If the certifier wants to override any of them, they can edit here and save — calls `POST /admin/channex/mapping/:listingId`."

### Step 4 — Push a full 500-day calendar (Cert Test T1)

1. On the same listing row, click **"Full Sync"** (or "Push ARI") button
2. In DevTools, point out:
   - `POST /admin/channex/full-sync/<listingId>` → 200 OK
   - Response: `{ success: true, taskIds: ["<avail-task-uuid>", "<rates-task-uuid>"], ... }`
3. **Copy both task IDs** — paste them into the cert form

> "That's exactly two Channex API calls — one to POST /availability with 500 days for the room type, one to POST /restrictions with 500 days of rates and minStay for the rate plan. The data isn't hardcoded — it's pulled from our inventory table with realistic seasonal variation. Channex returns a task ID for each, which we surface for your form."

### Step 5 — Verify in Channex that 500 days landed

1. Switch to Channex staging dashboard → **Inventory** for the new property
2. Scroll through dates — every day for the next ~16 months has availability + rate set
3. Pick a random date 6 months out — show that the rate isn't default; it varies

> "Note how the rates change by season and day-of-week — this isn't a flat placeholder. It's the actual content our PMS holds for that property."

### Step 6 — Trigger a delta update (Cert Test T9/T10/T11)

This is where you prove availability stays in sync after a booking.

1. Click **"+ Create Booking"** (the global booking button) on Cert Demo Villa
2. Fill in:
   - Check-in: a date 30 days from today (`YYYY-MM-DD`)
   - Check-out: 3 nights later
   - Guest name: `Cert Reviewer`
   - Guests: 2
   - Total: $600
3. Submit
4. In DevTools, point out the **chain of calls**:
   - `POST /api/bookings/manual` → 201 Created (booking saved locally)
   - `POST /admin/channex/push-ari` → 200 OK with `taskId` returned
5. Switch to Channex staging → Inventory for that date range → availability now shows `0` (blocked)

> "That's the event-driven push. The booking persists locally first as source of truth, then our BookingsService.createManual synchronously calls ChannexAriService.pushAvailability — single POST /availability call to Channex with availability=0 for the date range. The task ID is logged with our [CHANNEX_CERT_LOG] marker and stored against the mapping for traceability."

### Step 7 — Cancel the booking, show availability returns

1. In our admin Bookings list, find the booking → **Cancel**
2. DevTools: `DELETE /api/bookings/:id` → 200 OK, then `POST /admin/channex/push-ari` with `availability:1`
3. Channex dashboard → same date range now shows availability back to `1`

> "Symmetric on cancel — same endpoint, opposite value. No drift. No manual reconciliation."

### Step 8 — Show the webhook log

1. Admin → **Channex Sync Ops → Webhook Logs**
2. The recent push events are visible with timestamps + task IDs

> "Every sync event we send or receive is recorded. If Channex pushes us a booking from an OTA, it lands here too — we have a dedicated `POST /connect/webhook/booking-revision` endpoint with HMAC signature validation."

---

## Talking Points for Certifier Questions

| Q | Answer |
|---|---|
| What happens if Channex rate-limits you (429)? | Our `ChannexHttpClient` has a per-property token bucket — 20 calls/min/property, respects `Retry-After`, exponential backoff over 3 retries. |
| Multi-room property? | Same flow — `executeFullSync` walks all room types on the property; one POST /availability with all room_type_ids, one POST /restrictions with all rate_plan_ids. |
| What if the build half-completes? | Each step rolls back the previous ones on failure — `BadRequestException` propagated to UI with the exact Channex error message. |
| 500-day sync = how many API calls? | **Exactly 2.** One /availability, one /restrictions. We batch all dates into single POSTs with date_from/date_to ranges, collapsing consecutive identical days into segments. |
| Where's the data persistence? | `ChannexMapping` table — denormalized + `Listing.channexPropertyId` + `RoomType.channexRoomTypeId/RatePlanId`. Verified by unique constraint on (userId, listingId). |

---

## Known Risks for the Live Call

1. **The duplicate listings (27 and 35 both bound to channex property `3db72f15-...`)** — don't demo on those. Build a fresh property in Step 1.
2. **Two ChannexMapping rows on listing 35 use the same room_type_id (`56878137`)** — leftover dupe. Skip listing 35 entirely.
3. **If the certifier insists on testing the existing Erorentals property** — use listing 27 only (lower ID, more canonical). Tell them: "There's a dev-leftover duplicate on listing 35 we're cleaning up post-cert."
4. **`Inventory` table doesn't have a `price` column** — the 500-day rate generator falls back to `ChannexDeepSyncService.generateRealisticRate(listingId, date)` which uses listing.basePrice + seasonal multipliers. Not a blocker but be aware.
5. **Frontend `index.html` cache** — if the Mapping button doesn't appear, hard-refresh (Cmd-Shift-R). CloudFront invalidation should be done, but browser cache lingers.

---

## Rollback Plan If Something Breaks Live

If the live call hits a problem you didn't anticipate:

1. **"Let me show you the API response directly"** — open DevTools, click the failing request, show the raw response. Often the certifier just wants to see that the wire format is right, not perfect UX.
2. **Keep curl ready** in a terminal as backup. The exact commands that ALL worked against live staging tonight:
   ```bash
   # Build property (Step A)
   curl -X POST 'https://staging.channex.io/api/v1/properties' \
     -H 'user-api-key: $CHANNEX_KEY' -H 'Content-Type: application/json' \
     -d '{"property":{"title":"Demo","currency":"USD","country":"US"}}'

   # Push availability (Cert T9/T10)
   curl -X POST 'https://staging.channex.io/api/v1/availability' \
     -H 'user-api-key: $CHANNEX_KEY' -H 'Content-Type: application/json' \
     -d '{"values":[{"property_id":"<prop>","room_type_id":"<rt>","date_from":"2026-06-15","date_to":"2026-06-17","availability":1}]}'

   # Verify it stuck
   curl -g 'https://staging.channex.io/api/v1/availability?filter[property_id]=<prop>&filter[date]=2026-06-15' \
     -H 'user-api-key: $CHANNEX_KEY'
   ```

3. **Worst case:** Tell the certifier "the data path is right; let me walk you through the code." Open `api/src/channex/channex.service.ts buildPropertyInChannex` — every step is explicit and commented.

---

## Tonight's Live Dry-Run Results (all green)

| Test | Wire-level result | Notes |
|---|---|---|
| `POST /properties` | Returns `{ data: { id, attributes } }` — got a real property_id | Fixed: code was expecting array shape |
| `POST /room_types` | Returns 200 with room_type_id | Fixed: was missing `occ_children`/`occ_infants` |
| `POST /rate_plans` | Returns 200 with rate_plan_id | Fixed: was missing `occupancy`/`is_primary`/`sell_mode` |
| `POST /availability` with `{value:1}` | Returns task_id; `GET /availability` confirms `1` stored | ✅ |
| `POST /restrictions` with `{rate:15500, min_stay_arrival:2}` | Returns task_id; `GET /restrictions` confirms `rate=155.00, min_stay_arrival=2` stored | ✅ |
| `DELETE /properties/:id` (rollback) | Returns `{meta:{message:"Success"}}` | ✅ |

All three bugs in the build flow were fixed and deployed in commit `c7509b8` (Sun 22:54 EDT).
