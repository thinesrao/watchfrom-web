import Logo from "@/components/logo";

type PinLoaderProps = {
  /** Pin height in px. */
  size?: number;
  /** Show the pulsing halo (block loaders). Off = gentle pin pulse for inline spots. */
  halo?: boolean;
  className?: string;
};

/**
 * Branded loading indicator — the "Source Pin" in place of a generic spinner.
 * Larger spots get the pulsing halo; tight inline spots just breathe.
 * Both hold still under prefers-reduced-motion.
 */
export default function PinLoader({
  size = 40,
  halo = true,
  className = "",
}: PinLoaderProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      {halo ? (
        <>
          <span
            aria-hidden="true"
            className="absolute rounded-full bg-accent/20 animate-ping motion-reduce:hidden"
            style={{ width: size * 1.4, height: size * 1.4 }}
          />
          <Logo showWordmark={false} markSize={size} />
        </>
      ) : (
        <span className="animate-pulse motion-reduce:animate-none">
          <Logo showWordmark={false} markSize={size} />
        </span>
      )}
    </span>
  );
}
