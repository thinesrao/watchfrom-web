import { describe, it, expect } from "vitest";
import {
  SERVICES,
  ALLOWED_PROVIDER_IDS,
  filterAllowedProviders,
  serviceLabelForProviderId,
} from "./providers";
import type { WatchProvider } from "./types";

describe("providers config", () => {
  it("defines the three subscribed services with their TMDB ids", () => {
    expect(SERVICES).toEqual([
      { key: "netflix", label: "Netflix", providerIds: [8] },
      { key: "max", label: "Max", providerIds: [1899, 384] },
      { key: "prime", label: "Prime Video", providerIds: [119, 9] },
    ]);
  });

  it("builds a flat allow-list of all provider ids", () => {
    expect(ALLOWED_PROVIDER_IDS).toEqual(new Set([8, 1899, 384, 119, 9]));
  });
});

describe("filterAllowedProviders", () => {
  const netflix: WatchProvider = {
    providerId: 8,
    providerName: "Netflix",
    logoPath: "/netflix.jpg",
    providerType: "flatrate",
  };
  const disneyPlus: WatchProvider = {
    providerId: 337,
    providerName: "Disney Plus",
    logoPath: "/disney.jpg",
    providerType: "flatrate",
  };

  it("keeps only providers in the allow-list", () => {
    expect(filterAllowedProviders([netflix, disneyPlus])).toEqual([netflix]);
  });

  it("returns an empty array when nothing is allowed", () => {
    expect(filterAllowedProviders([disneyPlus])).toEqual([]);
  });
});

describe("serviceLabelForProviderId", () => {
  it("returns the service label for a known provider id", () => {
    expect(serviceLabelForProviderId(1899)).toBe("Max");
    expect(serviceLabelForProviderId(9)).toBe("Prime Video");
  });

  it("returns an empty string for an unknown provider id", () => {
    expect(serviceLabelForProviderId(337)).toBe("");
  });
});
