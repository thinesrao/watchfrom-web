import Image from "next/image";
import type { WatchProvider } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  flatrate: "Stream",
  rent: "Rent",
  buy: "Buy",
};

export default function ProviderLogo({ provider }: { provider: WatchProvider }) {
  return (
    <div className="flex items-center gap-2 bg-surface-dim rounded-lg px-2.5 py-1.5">
      <Image
        src={`https://image.tmdb.org/t/p/w92${provider.logoPath}`}
        alt={provider.providerName}
        width={24}
        height={24}
        className="w-6 h-6 rounded"
      />
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{provider.providerName}</p>
        <p className="text-[10px] text-text-dim">{TYPE_LABELS[provider.providerType]}</p>
      </div>
    </div>
  );
}
