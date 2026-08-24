"use client";

import { useState } from "react";
import type { CountryAvailability as CountryAvailabilityType } from "@/lib/types";
import ProviderLogo from "./provider-logo";

export default function CountryAvailability({
  availability,
}: {
  availability: CountryAvailabilityType[];
}) {
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = availability.filter(
    (c) =>
      c.countryName.toLowerCase().includes(filter.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(filter.toLowerCase())
  );

  const displayed = showAll ? filtered : filtered.slice(0, 10);
  const hasMore = filtered.length > 10;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          Available in {availability.length} {availability.length === 1 ? "country" : "countries"}
        </h2>
      </div>

      {availability.length > 5 && (
        <input
          type="text"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setShowAll(false);
          }}
          placeholder="Filter countries..."
          className="w-full bg-surface-dim border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent transition-colors"
        />
      )}

      <div className="space-y-2">
        {displayed.map((country) => (
          <div
            key={country.countryCode}
            className="bg-surface border border-border rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{country.flagEmoji}</span>
              <span className="font-medium text-sm">{country.countryName}</span>
              <span className="text-xs text-text-dim">{country.countryCode}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {country.providers.map((p) => (
                <ProviderLogo key={`${p.providerId}-${p.providerType}`} provider={p} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Show all {filtered.length} countries
        </button>
      )}

      {filtered.length === 0 && (
        <p className="text-text-dim text-sm text-center py-4">
          No countries match your filter.
        </p>
      )}
    </div>
  );
}
