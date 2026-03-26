import { NextResponse } from "next/server";

export async function POST(request) {
  const { password } = await request.json();
  const correct = process.env.JUDGES_PASSWORD;

  if (!correct) {
    return NextResponse.json({ error: "Password not configured on server." }, { status: 503 });
  }

  if (password === correct) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
}
