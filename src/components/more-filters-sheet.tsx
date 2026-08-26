// src/components/more-filters-sheet.tsx
"use client";

import { SERVICES } from "@/lib/providers";
import { DECADES } from "@/lib/decades";
import { DIRECTORS } from "@/lib/directors";
import type { MediaType } from "@/lib/types";

export interface MoreFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  mediaType: MediaType;
  serviceKey: string;
  onServiceChange: (key: string) => void;
  decadeLabel: string | null;
  onDecadeChange: (label: string | null) => void;
  directorId: number | null;
  onDirectorChange: (id: number | null) => void;
}

export default function MoreFiltersSheet({
  open,
  onClose,
  mediaType,
  serviceKey,
  onServiceChange,
  decadeLabel,
  onDecadeChange,
  directorId,
  onDirectorChange,
}: MoreFiltersSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className="relative glass rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto p-4 space-y-5"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">More filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-accent transition-colors text-sm"
          >
            Done
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-text-dim uppercase tracking-wide">Service</p>
          <div className="flex flex-wrap gap-1.5">
            {[{ key: "all", label: "All My Services" }, ...SERVICES].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onServiceChange(s.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  serviceKey === s.key
                    ? "bg-accent text-white"
                    : "bg-surface border border-border text-text-dim hover:border-accent/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-text-dim uppercase tracking-wide">Decade</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onDecadeChange(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                decadeLabel === null
                  ? "bg-accent text-white"
                  : "bg-surface border border-border text-text-dim hover:border-accent/40"
              }`}
            >
              Any
            </button>
            {DECADES.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => onDecadeChange(d.label)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  decadeLabel === d.label
                    ? "bg-accent text-white"
                    : "bg-surface border border-border text-text-dim hover:border-accent/40"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-text-dim uppercase tracking-wide">Director</p>
          {mediaType === "tv" ? (
            <p className="text-xs text-text-dim">
              Director filtering is only available for movies.
            </p>
          ) : (
            <select
              value={directorId ?? ""}
              onChange={(e) => onDirectorChange(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Any director</option>
              {DIRECTORS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
