"use client";

import type { CountryAvailability } from "@/lib/types";
import ProviderLogo from "./provider-logo";

export default function SgAvailability({
  availability,
}: {
  availability: CountryAvailability[];
}) {
  const sg = availability.find((c) => c.countryCode === "SG");

  if (!sg) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        <p className="text-text-dim text-sm">
          Not available for streaming in Singapore
        </p>
      </div>
    );
  }

  const flatrate = sg.providers.filter((p) => p.providerType === "flatrate");
  const rent = sg.providers.filter((p) => p.providerType === "rent");
  const buy = sg.providers.filter((p) => p.providerType === "buy");

  if (flatrate.length === 0 && rent.length === 0 && buy.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        <p className="text-text-dim text-sm">
          Not available for streaming in Singapore
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🇸🇬</span>
        <h3 className="font-semibold text-sm">
          {flatrate.length > 0
            ? "Available in Singapore"
            : "Not streaming in Singapore"}
        </h3>
      </div>

      {flatrate.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-text-dim uppercase tracking-wide">Stream</p>
          <div className="flex flex-wrap gap-1.5">
            {flatrate.map((p) => (
              <ProviderLogo key={p.providerId} provider={p} />
            ))}
          </div>
        </div>
      )}

      {rent.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-text-dim uppercase tracking-wide">Rent</p>
          <div className="flex flex-wrap gap-1.5">
            {rent.map((p) => (
              <ProviderLogo key={p.providerId} provider={p} />
            ))}
          </div>
        </div>
      )}

      {buy.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-text-dim uppercase tracking-wide">Buy</p>
          <div className="flex flex-wrap gap-1.5">
            {buy.map((p) => (
              <ProviderLogo key={p.providerId} provider={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
