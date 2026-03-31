import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { code?: string };
    const code = (body.code || "").trim();
    const expected = (process.env.TEILNAHME_CODE || "").trim();

    if (!expected) {
      return NextResponse.json(
        { ok: false, error: "Teilnahme-Code ist nicht konfiguriert." },
        { status: 500 }
      );
    }

    if (code !== expected) {
      return NextResponse.json(
        { ok: false, error: "Code ist ungültig." },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültige Anfrage." },
      { status: 400 }
    );
  }
}
