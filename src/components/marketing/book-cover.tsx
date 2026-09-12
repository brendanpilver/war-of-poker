import Image from "next/image";
import { shortStackPlo } from "@/lib/short-stack-plo";

type BookCoverProps = {
  /** Passed to next/image so the browser can pick a correctly sized file. */
  sizes: string;
  className?: string;
  loading?: "eager" | "lazy";
};

export function BookCover({ sizes, className = "", loading }: BookCoverProps) {
  const { cover, title, author } = shortStackPlo;

  return (
    <Image
      src={cover.src}
      width={cover.width}
      height={cover.height}
      alt={`${title} by ${author}, book cover`}
      sizes={sizes}
      loading={loading}
      className={`h-auto shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] ring-1 ring-bone/10 ${className}`}
    />
  );
}
