export interface Director {
  id: number;
  name: string;
}

// TMDB person ids verified against /search/person on 2026-08-26.
export const DIRECTORS: Director[] = [
  { id: 525, name: "Christopher Nolan" },
  { id: 488, name: "Steven Spielberg" },
  { id: 1032, name: "Martin Scorsese" },
  { id: 138, name: "Quentin Tarantino" },
  { id: 137427, name: "Denis Villeneuve" },
  { id: 45400, name: "Greta Gerwig" },
  { id: 21684, name: "Bong Joon-ho" },
  { id: 5655, name: "Wes Anderson" },
  { id: 7467, name: "David Fincher" },
  { id: 578, name: "Ridley Scott" },
  { id: 2710, name: "James Cameron" },
  { id: 291263, name: "Jordan Peele" },
  { id: 55934, name: "Taika Waititi" },
  { id: 1769, name: "Sofia Coppola" },
  { id: 10828, name: "Guillermo del Toro" },
  { id: 9033, name: "Christopher McQuarrie" },
];

export function directorName(id: number): string {
  return DIRECTORS.find((d) => d.id === id)?.name ?? "";
}
