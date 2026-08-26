import { useId } from "react";

const PIN_PATH =
  "M32 4 C19 4 8.5 14.4 8.5 27.2 C8.5 41.8 32 63 32 63 C32 63 55.5 41.8 55.5 27.2 C55.5 14.4 45 4 32 4 Z M27 17.5 L27 37 L44 27.3 Z";

type LogoProps = {
  /** Show the "watchfrom" wordmark next to the mark. */
  showWordmark?: boolean;
  /** Height of the pin mark in px. */
  markSize?: number;
  className?: string;
};

/**
 * watchfrom "Source Pin" logo — a map pin with the play triangle punched
 * clean through it ("press play, from here"). The mark uses a fixed cyan
 * gradient; the wordmark inherits the display font from the design system.
 */
export default function Logo({
  showWordmark = true,
  markSize = 26,
  className = "",
}: LogoProps) {
  const gradId = `wf-pin-${useId()}`;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={(markSize * 64) / 70}
        height={markSize}
        viewBox="0 0 64 70"
        fill="none"
        role={showWordmark ? "presentation" : "img"}
        aria-hidden={showWordmark ? true : undefined}
        aria-label={showWordmark ? undefined : "watchfrom"}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6DDBEB" />
            <stop offset="1" stopColor="#2E9FB8" />
          </linearGradient>
        </defs>
        <path fillRule="evenodd" fill={`url(#${gradId})`} d={PIN_PATH} />
      </svg>
      {showWordmark && (
        <span className="font-display font-bold text-xl tracking-tight text-text">
          watchfrom
        </span>
      )}
    </span>
  );
}
