import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { system, prompt, max_tokens } = await request.json();
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", max_tokens: max_tokens || 1000,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await response.json();
    return NextResponse.json({ texto: data.choices?.[0]?.message?.content || "Sin respuesta" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
