import { NextRequest, NextResponse } from "next/server";
import { getDirectors } from "@/lib/tmdb";

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
    const directors = await getDirectors(tmdbId, type);
    return NextResponse.json({ directors });
  } catch (error) {
    console.error("Credits error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credits. Please try again." },
      { status: 500 }
    );
  }
}
