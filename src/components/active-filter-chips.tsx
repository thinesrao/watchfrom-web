// src/components/active-filter-chips.tsx
"use client";

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export default function ActiveFilterChips({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/25 text-accent rounded-full px-3 py-1 text-xs hover:bg-accent/20 transition-colors"
        >
          {chip.label}
          <span aria-hidden="true">&times;</span>
        </button>
      ))}
    </div>
  );
}
