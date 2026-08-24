import type { SearchResult, CountryAvailability, WatchProvider } from "./types";
import { countryName, flagEmoji } from "./countries";

const BASE_URL = "https://api.themoviedb.org/3";

function headers(): HeadersInit {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) {
    throw new Error("TMDB_API_READ_ACCESS_TOKEN is not configured");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function searchMulti(query: string): Promise<SearchResult[]> {
  const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status}`);
  }

  const data = await res.json();

  return (data.results ?? [])
    .filter(
      (item: Record<string, unknown>) =>
        item.media_type === "movie" || item.media_type === "tv"
    )
    .slice(0, 20)
    .map((item: Record<string, unknown>): SearchResult => {
      const isMovie = item.media_type === "movie";
      const title = (isMovie ? item.title : item.name) as string;
      const date = (isMovie ? item.release_date : item.first_air_date) as
        | string
        | null;

      return {
        id: item.id as number,
        title,
        mediaType: isMovie ? "movie" : "tv",
        posterPath: item.poster_path as string | null,
        releaseYear: date ? date.substring(0, 4) : null,
        overview: item.overview as string | null,
        voteAverage: item.vote_average as number | null,
      };
    });
}

export async function getWatchProviders(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<CountryAvailability[]> {
  const url = `${BASE_URL}/${mediaType}/${tmdbId}/watch/providers`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`TMDB providers failed: ${res.status}`);
  }

  const data = await res.json();
  const results = data.results ?? {};

  const availability: CountryAvailability[] = [];

  for (const [code, value] of Object.entries(results)) {
    const entry = value as Record<string, unknown>;
    const providers: WatchProvider[] = [];

    for (const type of ["flatrate", "rent", "buy"] as const) {
      const list = entry[type] as Array<Record<string, unknown>> | undefined;
      if (!list) continue;

      for (const p of list) {
        providers.push({
          providerId: p.provider_id as number,
          providerName: p.provider_name as string,
          logoPath: p.logo_path as string,
          providerType: type,
        });
      }
    }

    if (providers.length > 0) {
      availability.push({
        countryCode: code,
        countryName: countryName(code),
        flagEmoji: flagEmoji(code),
        providers,
      });
    }
  }

  availability.sort((a, b) => a.countryName.localeCompare(b.countryName));
  return availability;
}

export async function discoverTitles(params: {
  mediaType: "movie" | "tv";
  watchRegion: string;
  providerIds: number[];
  page: number;
}): Promise<{ results: SearchResult[]; totalPages: number }> {
  const { mediaType, watchRegion, providerIds, page } = params;
  const url =
    `${BASE_URL}/discover/${mediaType}?watch_region=${watchRegion}` +
    `&with_watch_providers=${providerIds.join("|")}` +
    `&with_watch_monetization_types=flatrate&sort_by=popularity.desc&page=${page}`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`TMDB discover failed: ${res.status}`);
  }

  const data = await res.json();

  const results: SearchResult[] = (data.results ?? []).map(
    (item: Record<string, unknown>): SearchResult => {
      const isMovie = mediaType === "movie";
      const title = (isMovie ? item.title : item.name) as string;
      const date = (isMovie ? item.release_date : item.first_air_date) as
        | string
        | null;

      return {
        id: item.id as number,
        title,
        mediaType,
        posterPath: item.poster_path as string | null,
        releaseYear: date ? date.substring(0, 4) : null,
        overview: item.overview as string | null,
        voteAverage: item.vote_average as number | null,
      };
    }
  );

  return { results, totalPages: (data.total_pages as number) ?? 1 };
}
