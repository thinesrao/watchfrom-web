import type { MediaType } from "./types";

export interface Genre {
  id: number;
  label: string;
}

export const MOVIE_GENRES: Genre[] = [
  { id: 28, label: "Action" },
  { id: 12, label: "Adventure" },
  { id: 16, label: "Animation" },
  { id: 35, label: "Comedy" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentary" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 14, label: "Fantasy" },
  { id: 36, label: "History" },
  { id: 27, label: "Horror" },
  { id: 10402, label: "Music" },
  { id: 9648, label: "Mystery" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Science Fiction" },
  { id: 53, label: "Thriller" },
  { id: 10752, label: "War" },
];

export const TV_GENRES: Genre[] = [
  { id: 10759, label: "Action & Adventure" },
  { id: 16, label: "Animation" },
  { id: 35, label: "Comedy" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentary" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 9648, label: "Mystery" },
  { id: 10765, label: "Sci-Fi & Fantasy" },
  { id: 10768, label: "War & Politics" },
];

export function genresForMediaType(mediaType: MediaType): Genre[] {
  return mediaType === "movie" ? MOVIE_GENRES : TV_GENRES;
}

export function genreLabel(mediaType: MediaType, id: number): string {
  return genresForMediaType(mediaType).find((g) => g.id === id)?.label ?? "";
}
