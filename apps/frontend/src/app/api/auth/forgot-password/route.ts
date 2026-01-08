// apps/frontend/src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (!user) return NextResponse.json({ ok: true }); // don't reveal

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min

  await db.insert(verificationTokens).values({
    identifier: `pwd:${user.id}`,
    token,
    expires,
  });

  const base = process.env.NEXTAUTH_URL!;
  const resetUrl = `${base}/auth/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return NextResponse.json({ ok: true });
}
