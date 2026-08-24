import { describe, it, expect } from "vitest";
import { isUnlockable } from "./discovery-eligibility";
import type { CountryAvailability } from "./types";

const sgWithNetflix: CountryAvailability[] = [
  {
    countryCode: "SG",
    countryName: "Singapore",
    flagEmoji: "🇸🇬",
    providers: [
      { providerId: 8, providerName: "Netflix", logoPath: "/n.jpg", providerType: "flatrate" },
    ],
  },
];

const sgWithoutFlatrate: CountryAvailability[] = [
  {
    countryCode: "SG",
    countryName: "Singapore",
    flagEmoji: "🇸🇬",
    providers: [
      { providerId: 8, providerName: "Netflix", logoPath: "/n.jpg", providerType: "rent" },
    ],
  },
];

describe("isUnlockable", () => {
  it("is false when the selected provider already streams in SG", () => {
    expect(isUnlockable(sgWithNetflix, [8])).toBe(false);
  });

  it("is true when SG only has the provider as rent/buy, not flatrate", () => {
    expect(isUnlockable(sgWithoutFlatrate, [8])).toBe(true);
  });

  it("is true when there is no SG entry at all", () => {
    expect(isUnlockable([], [8])).toBe(true);
  });

  it("is true when SG streams a different provider than the selected ones", () => {
    expect(isUnlockable(sgWithNetflix, [1899, 384])).toBe(true);
  });
});
