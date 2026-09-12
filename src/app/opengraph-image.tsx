import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { shortStackPlo } from "@/lib/short-stack-plo";

export const alt = `${shortStackPlo.title} by ${shortStackPlo.author}: ${shortStackPlo.subtitle}. Published by ${shortStackPlo.publisher}.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [logo, cover] = await Promise.all([
    readFile(join(process.cwd(), "public/brand/war-of-poker-stencil-logo.png"), "base64"),
    readFile(join(process.cwd(), "public/books/short-stack-plo-cover.jpg"), "base64"),
  ]);

  // Plain <img> is required here: ImageResponse renders JSX to a PNG, not HTML.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          gap: 64,
          padding: 64,
          background: "#0b0a09",
          color: "#efe5db",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <img src={`data:image/png;base64,${logo}`} width={132} height={100} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>
              {shortStackPlo.title}
            </div>
            <div style={{ marginTop: 20, fontSize: 30, lineHeight: 1.3, color: "#e3ac63" }}>
              {shortStackPlo.subtitle}
            </div>
          </div>
          <div style={{ fontSize: 24, color: "#aea797" }}>
            {`By ${shortStackPlo.author} · ${shortStackPlo.publisher}`}
          </div>
        </div>
        <img src={`data:image/jpeg;base64,${cover}`} width={335} height={502} alt="" />
      </div>
    ),
    size,
  );
}
