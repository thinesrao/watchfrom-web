"use client";

import { useState } from "react";
import Image from "next/image";
import type { CountryAvailability } from "@/lib/types";
import { flagEmoji } from "@/lib/countries";

interface ProviderGroup {
  providerId: number;
  providerName: string;
  logoPath: string;
  countries: { code: string; name: string; flag: string }[];
}

function groupByProvider(availability: CountryAvailability[]): ProviderGroup[] {
  const nonSg = availability.filter((c) => c.countryCode !== "SG");
  const map = new Map<number, ProviderGroup>();

  for (const country of nonSg) {
    const flatrate = country.providers.filter((p) => p.providerType === "flatrate");
    for (const provider of flatrate) {
      const existing = map.get(provider.providerId);
      const countryEntry = {
        code: country.countryCode,
        name: country.countryName,
        flag: country.flagEmoji || flagEmoji(country.countryCode),
      };

      if (existing) {
        existing.countries.push(countryEntry);
      } else {
        map.set(provider.providerId, {
          providerId: provider.providerId,
          providerName: provider.providerName,
          logoPath: provider.logoPath,
          countries: [countryEntry],
        });
      }
    }
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => b.countries.length - a.countries.length);
  return groups;
}

export default function WorldwideAvailability({
  availability,
}: {
  availability: CountryAvailability[];
}) {
  const [expandedProvider, setExpandedProvider] = useState<number | null>(null);
  const groups = groupByProvider(availability);

  if (groups.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        <p className="text-text-dim text-sm">
          No streaming availability data worldwide.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Worldwide Streaming</h2>
      <p className="text-text-dim text-xs">
        Connect your VPN to any of these countries to stream.
      </p>

      <div className="space-y-2">
        {groups.map((group) => {
          const isExpanded = expandedProvider === group.providerId;
          const preview = group.countries.slice(0, 4);
          const remaining = group.countries.length - 4;

          return (
            <button
              key={group.providerId}
              onClick={() =>
                setExpandedProvider(isExpanded ? null : group.providerId)
              }
              className="w-full text-left bg-surface border border-border rounded-lg p-3 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={`https://image.tmdb.org/t/p/w92${group.logoPath}`}
                  alt={group.providerName}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{group.providerName}</p>
                  <p className="text-xs text-text-dim">
                    {preview.map((c) => `${c.flag} ${c.code}`).join(", ")}
                    {remaining > 0 && ` +${remaining} more`}
                  </p>
                </div>
                <span className="text-xs text-text-dim shrink-0">
                  {group.countries.length}{" "}
                  {group.countries.length === 1 ? "country" : "countries"}
                </span>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex flex-wrap gap-1.5">
                    {group.countries.map((c) => (
                      <span
                        key={c.code}
                        className="inline-flex items-center gap-1 bg-surface-dim rounded px-2 py-1 text-xs"
                      >
                        {c.flag} {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
