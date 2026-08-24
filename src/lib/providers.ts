import type { WatchProvider } from "./types";

export const SERVICES = [
  { key: "netflix", label: "Netflix", providerIds: [8] },
  { key: "max", label: "Max", providerIds: [1899, 384] },
  { key: "prime", label: "Prime Video", providerIds: [119, 9] },
] as const;

export const ALLOWED_PROVIDER_IDS = new Set<number>(
  SERVICES.flatMap((service) => service.providerIds)
);

export function filterAllowedProviders(
  providers: WatchProvider[]
): WatchProvider[] {
  return providers.filter((provider) =>
    ALLOWED_PROVIDER_IDS.has(provider.providerId)
  );
}

export function serviceLabelForProviderId(providerId: number): string {
  const service = SERVICES.find((s) =>
    (s.providerIds as readonly number[]).includes(providerId)
  );
  return service?.label ?? "";
}
