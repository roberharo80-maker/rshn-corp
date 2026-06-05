"use client";
import { useState } from "react";
import { supabase } from "../../app/lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function ingresar() {
    if (!email || !password) { setError("Ingrese correo y contrasena."); return; }
    setCargando(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError("Credenciales incorrectas. Verifique e intente nuevamente."); setCargando(false); return; }
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-2xl mx-auto mb-4">R</div>
          <h1 className="text-2xl font-black text-white">RSHN CORP</h1>
          <p className="text-zinc-400 text-sm mt-1">Control de Fuerza Laboral</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Correo electronico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white text-sm focus:outline-none focus:border-blue-500"
              onKeyDown={e => e.key === "Enter" && ingresar()} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Contrasena</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white text-sm focus:outline-none focus:border-blue-500"
              onKeyDown={e => e.key === "Enter" && ingresar()} />
          </div>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button onClick={ingresar} disabled={cargando}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-bold text-white transition disabled:opacity-50">
            {cargando ? "Ingresando..." : "Ingresar al sistema"}
          </button>
        </div>
        <p className="text-xs text-zinc-600 text-center mt-4">RSHN CORP · @HombreDeSeguridad · 2026</p>
      </div>
    </div>
  );
}
