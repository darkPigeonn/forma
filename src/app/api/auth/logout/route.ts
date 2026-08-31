import { NextResponse } from "next/server";
import { revokeSessionAndClearCookie } from "@/lib/firebase/auth";

export async function POST() {
  await revokeSessionAndClearCookie();
  return NextResponse.json({ ok: true });
}
