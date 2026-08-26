import type { MediaType } from "./types";

export interface Mood {
  key: string;
  label: string;
  movieGenreIds: number[];
  tvGenreIds: number[];
}

export const MOODS: Mood[] = [
  { key: "feel-good", label: "Feel-good", movieGenreIds: [35, 10751], tvGenreIds: [35, 10751] },
  { key: "intense", label: "Intense", movieGenreIds: [28, 53], tvGenreIds: [10759, 80] },
  { key: "mind-bending", label: "Mind-bending", movieGenreIds: [878, 9648], tvGenreIds: [10765, 9648] },
  { key: "dark", label: "Dark", movieGenreIds: [27, 80], tvGenreIds: [80, 9648] },
  { key: "light-easy", label: "Light & Easy", movieGenreIds: [35, 10402], tvGenreIds: [35] },
];

export function genreIdsForMood(key: string, mediaType: MediaType): number[] {
  const mood = MOODS.find((m) => m.key === key);
  if (!mood) return [];
  return mediaType === "movie" ? mood.movieGenreIds : mood.tvGenreIds;
}
