import { NextRequest, NextResponse } from "next/server";
import { getWatchProviders } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type");

  if (!id || !type || (type !== "movie" && type !== "tv")) {
    return NextResponse.json(
      { error: "Missing or invalid id/type parameters" },
      { status: 400 }
    );
  }

  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const availability = await getWatchProviders(tmdbId, type);
    return NextResponse.json({ availability });
  } catch (error) {
    console.error("Providers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers. Please try again." },
      { status: 500 }
    );
  }
}
