// src/components/pin-loader.tsx
export interface PinLoaderProps {
  size?: number;
}

export default function PinLoader({ size = 24 }: PinLoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="border-2 border-accent border-t-transparent rounded-full animate-spin"
      style={{ width: size, height: size }}
    />
  );
}
