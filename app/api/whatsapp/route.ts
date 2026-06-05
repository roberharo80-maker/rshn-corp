import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { telefono, mensaje, grupo } = await request.json();
    const instance = process.env.NEXT_PUBLIC_ULTRAMSG_INSTANCE;
    const token = process.env.NEXT_PUBLIC_ULTRAMSG_TOKEN;
    const grupoId = "120363408493385008@g.us";
    const destino = grupo ? grupoId : telefono;
    const tipo = grupo ? "groups" : "messages";
    const res = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: token!, to: destino, body: mensaje }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
