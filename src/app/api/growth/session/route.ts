import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAuthorizedToken } from "@/lib/admin-auth";
import { siteUrl } from "@/lib/site";

/**
 * Exchanges a valid `?token=` for an httpOnly cookie, so the operator token
 * stops appearing in browser history and referrers after the first visit.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const token = form.get("token");

  if (typeof token !== "string" || !isAuthorizedToken(token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const response = NextResponse.redirect(new URL("/growth", siteUrl), 303);
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/growth",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
