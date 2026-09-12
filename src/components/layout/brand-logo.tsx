import Image from "next/image";

// Intrinsic size of public/brand/war-of-poker-stencil-logo.png.
const LOGO_WIDTH = 1502;
const LOGO_HEIGHT = 1135;

type BrandLogoProps = {
  /** Rendered height in CSS pixels; used to request an appropriately sized file. */
  height: number;
  className?: string;
  loading?: "eager" | "lazy";
};

export function BrandLogo({ height, className, loading }: BrandLogoProps) {
  return (
    <Image
      src="/brand/war-of-poker-stencil-logo.png"
      alt="War of Poker"
      width={Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT)}
      height={height}
      loading={loading}
      className={className}
    />
  );
}
