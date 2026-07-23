import { NextResponse } from "next/server";

import { GOVERNANCE_COOKIE_NAME } from "@/foundation/security/governance-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(GOVERNANCE_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

