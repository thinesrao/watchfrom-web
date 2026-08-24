# VPN Discovery Feed — Design

## Summary

Add a "Discovery" tab that surfaces movies/TV shows popular on Netflix, Max, or
Prime Video in a foreign TMDB region but not yet streaming (flatrate) on that
same service in Singapore — i.e. titles worth unlocking with a VPN. Also
restrict every existing streaming-availability surface in the app to those
three services only.

## Global Provider Restriction

New file `src/lib/providers.ts` defines the app's subscribed services and a
flat allow-list:

```ts
export const SERVICES = [
  { key: "netflix", label: "Netflix", providerIds: [8] },
  { key: "max", label: "Max", providerIds: [1899, 384] },
  { key: "prime", label: "Prime Video", providerIds: [119, 9] },
] as const;

export const ALLOWED_PROVIDER_IDS = new Set(
  SERVICES.flatMap((s) => s.providerIds)
);
```

`SgAvailability`, `WorldwideAvailability`, and `CountryAvailability` each add
one filter step: drop any `WatchProvider` whose `providerId` is not in
`ALLOWED_PROVIDER_IDS`, before grouping/rendering. No prop or type changes —
purely an internal filter. Countries whose remaining provider list becomes
empty are treated the same as "no availability" (existing empty-state logic
already covers this since `groupByProvider`/render already skip empty lists).

## Discovery Feed UI

New route `src/app/discovery/page.tsx`, new nav link "Discovery" in
`src/app/layout.tsx` next to "Watchlist".

Controls (all local `useState` in the page):
- **Country dropdown**: US (default), GB, JP, KR, DE, CA, AU — labels use
  `countryName`/`flagEmoji` from `src/lib/countries.ts`.
- **Service pills**: "All My Services" (default) | "Netflix" | "Max" |
  "Prime Video" — sourced from `SERVICES`.
- **Content type toggle**: Movies (default) | TV Shows.

Changing any control resets the feed and re-runs the pipeline (see below).

Each result card shows: poster (`w300`), title, release year, TMDB rating,
and a badge — `{countryFlag} {countryCode} {serviceLabel}`, e.g.
"🇺🇸 US Netflix". `serviceLabel`/flag reflect the selected country and
whichever selected/allowed service actually appears in that title's source
region flatrate list (first match if "All My Services").

## Core Feed Logic & Pipeline

### New route: `GET /api/discover`

Mirrors the existing `/api/providers` route pattern (server-side, hides the
TMDB token).

Query params: `mediaType` (`movie`|`tv`), `watchRegion` (country code),
`providerIds` (comma-separated TMDB ids), `page` (number).

Calls TMDB `/discover/{movie|tv}` with `watch_region`, `with_watch_providers`
(ids joined with `|` for OR semantics — TMDB's syntax), `with_watch_monetization_types=flatrate`,
`sort_by=popularity.desc`, `page`. Returns a trimmed list:
`{ id, title, mediaType, posterPath, releaseYear, voteAverage }` (same shape
as `SearchResult` in `src/lib/types.ts`, reused) plus TMDB's `total_pages`.

### New hook: `src/lib/use-discovery-feed.ts`

Owns fetch/filter/pagination/cache state for the Discovery page. Exposes
`{ items, loading, error, hasMore, loadMore }` and re-fetches from page 1
whenever `(country, service, mediaType)` changes.

Pipeline per fetch:
1. Resolve `providerIds` for the current service selection: all 5 ids for
   "All My Services", or that service's own ids otherwise.
2. `GET /api/discover` for the current page.
3. For each returned title, check an in-memory `Map<string, CountryAvailability[]>`
   keyed by `${mediaType}-${id}` for a cached SG-availability result; on miss,
   batch-fetch `GET /api/providers?id&type` for all misses via `Promise.all`,
   and populate the cache from the responses.
4. **Eligibility**: a title is "unlockable" if none of the currently-selected
   provider ids appear in that title's `SG` entry's `flatrate` list (a title
   with no `SG` entry at all is trivially unlockable).
5. Append eligible titles to `items`.
6. If `items.length < 12` and TMDB `total_pages` not exhausted and pages
   fetched so far `< 5`, automatically fetch the next page and repeat from
   step 2. Otherwise stop and expose `hasMore` (`page < min(total_pages, 5)`)
   for a manual "Load more" button that continues the same loop from the
   next page.

The cache is a plain `Map` created once per hook instance (i.e. cleared on
full page reload, shared across filter toggles within a session) — this
satisfies "avoid redundant calls when users toggle filters back and forth"
without needing persistence.

## Error Handling

- `/api/discover` and `/api/providers` failures follow the existing pattern
  in `route.ts`: catch, `console.error`, `NextResponse.json({error}, {status})`.
- Hook surfaces a single `error` string on any fetch failure; page renders
  the same retry-button pattern used on the detail page.
- Exhausted pagination with zero eligible titles: empty state — "No
  unlockable titles found for these filters."

## Testing

- Unit tests (Vitest, matching repo conventions if present, otherwise add
  minimal Vitest config) for:
  - `isUnlockable(sgAvailability, selectedProviderIds)` — pure function
    extracted from the hook.
  - The provider-restriction filter used by `SgAvailability` /
    `WorldwideAvailability` / `CountryAvailability`.
  - The pagination/threshold loop in `use-discovery-feed.ts`, with `fetch`
    mocked to return canned discover/providers pages.
- Manual verification in the browser: run the app, exercise the Discovery
  tab across country/service/media-type combinations, confirm badges and
  empty/error states, confirm the detail page no longer shows non-allowed
  providers.

## Out of Scope

- Persisting the provider cache across reloads or sessions.
- Server-side/shared caching across users.
- Provider lists beyond the 6 dropdown countries or 3 services.
