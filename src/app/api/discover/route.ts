import { NextRequest, NextResponse } from "next/server";
import { discoverTitles } from "@/lib/tmdb";
import { MAX_PAGES } from "@/lib/discovery-feed";
import { ALLOWED_PROVIDER_IDS } from "@/lib/providers";
import type { DiscoverSortBy } from "@/lib/sort-options";

const SORT_BY_VALUES = new Set<DiscoverSortBy>([
  "popularity.desc",
  "vote_average.desc",
  "primary_release_date.desc",
  "first_air_date.desc",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const mediaType = request.nextUrl.searchParams.get("mediaType");
  const watchRegion = request.nextUrl.searchParams.get("watchRegion");
  const providerIdsParam = request.nextUrl.searchParams.get("providerIds");
  const pageParam = request.nextUrl.searchParams.get("page");

  if (
    !mediaType ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    !watchRegion ||
    !providerIdsParam
  ) {
    return NextResponse.json(
      { error: "Missing or invalid mediaType/watchRegion/providerIds parameters" },
      { status: 400 }
    );
  }

  if (!/^[A-Z]{2}$/.test(watchRegion)) {
    return NextResponse.json(
      { error: "Invalid watchRegion" },
      { status: 400 }
    );
  }

  const providerIds = providerIdsParam
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id) && ALLOWED_PROVIDER_IDS.has(id));

  if (providerIds.length === 0) {
    return NextResponse.json({ error: "Invalid providerIds" }, { status: 400 });
  }

  const parsedPage = parseInt(pageParam ?? "1", 10);
  const page = isNaN(parsedPage)
    ? 1
    : Math.min(Math.max(parsedPage, 1), MAX_PAGES);

  const genreIdsParam = request.nextUrl.searchParams.get("genreIds");
  let genreIds: number[] | undefined;
  if (genreIdsParam) {
    genreIds = genreIdsParam
      .split(",")
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id) && id > 0);
    if (genreIds.length === 0) {
      return NextResponse.json({ error: "Invalid genreIds" }, { status: 400 });
    }
  }

  const sortByParam = request.nextUrl.searchParams.get("sortBy");
  let sortBy: DiscoverSortBy | undefined;
  if (sortByParam) {
    if (!SORT_BY_VALUES.has(sortByParam as DiscoverSortBy)) {
      return NextResponse.json({ error: "Invalid sortBy" }, { status: 400 });
    }
    sortBy = sortByParam as DiscoverSortBy;
  }

  const voteCountGteParam = request.nextUrl.searchParams.get("voteCountGte");
  let voteCountGte: number | undefined;
  if (voteCountGteParam) {
    const parsed = parseInt(voteCountGteParam, 10);
    if (isNaN(parsed) || parsed < 0) {
      return NextResponse.json({ error: "Invalid voteCountGte" }, { status: 400 });
    }
    voteCountGte = parsed;
  }

  const dateGteParam = request.nextUrl.searchParams.get("dateGte");
  if (dateGteParam && !DATE_RE.test(dateGteParam)) {
    return NextResponse.json({ error: "Invalid dateGte" }, { status: 400 });
  }

  const dateLteParam = request.nextUrl.searchParams.get("dateLte");
  if (dateLteParam && !DATE_RE.test(dateLteParam)) {
    return NextResponse.json({ error: "Invalid dateLte" }, { status: 400 });
  }

  const crewIdParam = request.nextUrl.searchParams.get("crewId");
  let crewId: number | undefined;
  if (crewIdParam) {
    const parsed = parseInt(crewIdParam, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "Invalid crewId" }, { status: 400 });
    }
    crewId = parsed;
  }

  try {
    const { results, totalPages } = await discoverTitles({
      mediaType,
      watchRegion,
      providerIds,
      page,
      genreIds,
      sortBy,
      voteCountGte,
      dateGte: dateGteParam ?? undefined,
      dateLte: dateLteParam ?? undefined,
      crewId,
    });
    return NextResponse.json({ results, totalPages });
  } catch (error) {
    console.error("Discover error:", error);
    return NextResponse.json(
      { error: "Failed to load discovery feed. Please try again." },
      { status: 500 }
    );
  }
}
