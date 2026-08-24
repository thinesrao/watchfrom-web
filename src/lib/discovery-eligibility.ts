import type { CountryAvailability } from "./types";

export function isUnlockable(
  availability: CountryAvailability[],
  selectedProviderIds: number[]
): boolean {
  const sg = availability.find((c) => c.countryCode === "SG");
  if (!sg) return true;

  const sgFlatrateIds = new Set(
    sg.providers
      .filter((p) => p.providerType === "flatrate")
      .map((p) => p.providerId)
  );

  return !selectedProviderIds.some((id) => sgFlatrateIds.has(id));
}
