import { NextRequest, NextResponse } from "next/server";
import { discoverTitles } from "@/lib/tmdb";
import { MAX_PAGES } from "@/lib/discovery-feed";
import { ALLOWED_PROVIDER_IDS } from "@/lib/providers";

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

  try {
    const { results, totalPages } = await discoverTitles({
      mediaType,
      watchRegion,
      providerIds,
      page,
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
