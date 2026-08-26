import PinLoader from "@/components/pin-loader";

/**
 * Branded route-loading splash. Renders in the main content area (the nav
 * persists) while a server segment streams in.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <PinLoader size={40} />
        <span className="font-display font-semibold tracking-tight text-text-dim">
          watchfrom
        </span>
      </div>
    </div>
  );
}
