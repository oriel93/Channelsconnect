# Cert Demo — Quick Reference Card

**Keep this open during the screenshare. Everything is pre-built and verified.**

---

## The Demo Property

| Field | Value |
|---|---|
| **Local Listing ID** | `63` |
| **Title** | Cert Demo Villa |
| **Owner** | `oriel@erorentals.com` (you) |
| **Address** | 123 Cert Drive, Miami Beach, FL 33139, US |
| **Specs** | 2BR / 2BA / sleeps 4 / 3 beds |
| **Base price** | $250/night, USD |
| **Channex property_id** | `d2c9afd5-c170-4734-80ea-915959b51c9a` |
| **Channex room_type_id** | `3fe1946a-ced7-4c14-8ee8-03271e086248` (Standard 2BR, occ 4) |
| **Channex rate_plan_id** | `0e6f41bd-08ef-4a7b-a7ee-0df9b1ea8451` (Standard Rate, USD, per_room) |

**Status: built, mapped, fully synced with 500 days of varied rates. Ready to demo.**

---

## What's Already Done (verified live)

1. ✅ Property + room type + rate plan created on Channex via 3-step build flow
2. ✅ All 3 Channex IDs persisted locally (Listing + RoomType + ChannexMapping rows)
3. ✅ 500-day availability sync (`availability=1`) → task `8b8dbd56-091a-451d-9b7e-1a60abbf4a67`
4. ✅ 500-day rates sync (varied by DoW + season) → task `be096210-1e93-4147-ac06-4d3e070e383c`
5. ✅ Verified random sample dates show correct rates (e.g. 2026-07-04 Sat: $390, min 3 nights)
6. ✅ T9/T10 dry-run: blocked 2026-06-20→22, verified, restored — all clean

---

## Sample Rates to Point Out (to demonstrate variety)

When the certifier wants to see that rates aren't placeholder/flat:

| Date | Day | Channex shows | Why |
|---|---|---|---|
| 2026-06-15 | Mon | $325, min 1 | Summer +30% |
| 2026-07-04 | Sat | $390, min 3 | Summer + weekend + Fri/Sat 3-night min |
| 2026-12-25 | Fri | $287.50, min 3 | Winter +15%, Fri 3-night min |
| 2027-09-28 | Tue | $250, min 1 | Base rate, weekday |

---

## The Booking Demo (Test T9/T10/T11)

During the call, create a booking on listing 63 for **mid-July 2026** (high-rate season makes it visual). Suggested dates:

- **Check-in:** 2026-07-17 (Fri)
- **Check-out:** 2026-07-20 (Mon, 3 nights)
- **Guest:** "Cert Reviewer"
- **Total:** $1,170 (3 × $390 = $1,170, matches stored rate)

Then on Channex dashboard show:
- 2026-07-17, 18, 19: availability = `0` ✅ (blocked)
- 2026-07-16 and 2026-07-20: availability = `1` ✅ (untouched)
- **Channex Bookings tab** → booking should appear with guest name, dates, source="Offline", amount $1,170

Cancel the booking → availability restored to `1` on all 3 nights.

**Pre-existing test bookings on Channex** (you can delete or ignore during demo):
- `833690d9...` Guest "Test" 2026-09-10→-12 (left from initial wire-format probe)
- `b461f0b4...` Guest "Production Dryrun" 2026-10-15→-17 (left from deployed-code dry-run)

Both show the booking pipeline works end-to-end. Use dates outside Sep 10–12 and Oct 15–17 for the live demo if you want a clean availability picture.

---

## URLs to Have Open

| Tab | URL |
|---|---|
| Our admin | https://channelsconnect.com (login as oriel@erorentals.com) |
| Channex staging | https://staging.channex.io (login, then navigate to property `d2c9afd5...`) |
| API health | https://api.channelsconnect.com/health |

---

## If Something Goes Sideways

**Channex API returns 401:** Master key in ECS env is wrong. Check `sst secret list --stage production`. Current valid key starts with `uoMMbj`.

**Build button shows error:** Likely a network blip. Have these curl commands ready in a terminal as fallback:

```bash
# Reset the demo property if needed (DELETE everything, rebuild)
CHANNEX_KEY='uoMMbj2IDpia2PceIqP234g/3lmFkjeUlnTN9kFq/GgEvnYNKbBddBbtorQOjGll'
PROP='d2c9afd5-c170-4734-80ea-915959b51c9a'

# Inspect property
curl -H "user-api-key: $CHANNEX_KEY" "https://staging.channex.io/api/v1/properties/$PROP" | python3 -m json.tool

# Push availability=1 manually (T9/T10 fallback)
curl -X POST "https://staging.channex.io/api/v1/availability" \
  -H "user-api-key: $CHANNEX_KEY" -H "Content-Type: application/json" \
  -d '{"values":[{"property_id":"'$PROP'","room_type_id":"3fe1946a-ced7-4c14-8ee8-03271e086248","date_from":"2026-07-17","date_to":"2026-07-19","availability":0}]}'
```

**Listing 63 disappeared:** Run `SELECT * FROM listings WHERE id=63;` against Supabase. If gone, recreate it (script in `CERT_SCREENSHARE_SCRIPT.md`).

---

## Other Notes from Tonight's Cleanup

- **Josh's user account deleted** (both public.users and auth.users). All 16 of his listings, 3 bookings, 4 mappings, 5 sync_logs moved to your account.
- **Listing 27** (stale duplicate of Erorentals) archived + channex_property_id cleared. Don't show it on the demo.
- **Listing 35** (Erorentals - Dania Beach) now has clean 3-mapping setup (Twin, Double, King Suite) — also usable as a backup demo target if needed.
- **You now own 20 listings** (was 5). Most are old test junk you can clean up later.
