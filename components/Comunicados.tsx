"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

type Comunicado = {
  id: number; titulo: string; contenido: string; tipo: string;
  prioridad: string; creado_por: string; activo: boolean; created_at: string;
};

const TIPOS = ["General","Urgente","Recordatorio","Procedimiento","Cambio de turno","Capacitacion"];
const PRIORIDADES = ["Normal","Alta","Urgente"];

export default function Comunicados({ esEmpleado }: { esEmpleado?: boolean }) {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ titulo: "", contenido: "", tipo: "General", prioridad: "Normal", creado_por: "Supervisor", enviar_whatsapp: false });

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const { data } = await supabase.from("corp_comunicados").select("*").eq("activo", true).order("created_at", { ascending: false });
    if (data) setComunicados(data);
  }

  async function publicar() {
    if (!form.titulo.trim() || !form.contenido.trim()) { alert("Titulo y contenido son obligatorios."); return; }
    setGuardando(true);
    await supabase.from("corp_comunicados").insert([{ ...form, activo: true }]);
    if (form.enviar_whatsapp) {
      await fetch("/api/whatsapp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: (form.prioridad === "Urgente" ? "🚨 " : form.prioridad === "Alta" ? "⚠️ " : "📢 ") +
            "*" + form.tipo.toUpperCase() + " - RSHN CORP*\n\n" +
            "*" + form.titulo + "*\n\n" + form.contenido + "\n\n_" + form.creado_por + "_",
          grupo: true,
        }),
      }).catch(() => {});
    }
    setGuardando(false);
    setMostrarForm(false);
    setForm({ titulo: "", contenido: "", tipo: "General", prioridad: "Normal", creado_por: "Supervisor", enviar_whatsapp: false });
    await cargar();
  }

  const PRIORIDAD_STYLE: Record<string, string> = {
    "Normal": "border-zinc-800 bg-zinc-950",
    "Alta": "border-yellow-900 bg-yellow-950/10",
    "Urgente": "border-red-900 bg-red-950/10",
  };

  const PRIORIDAD_BADGE: Record<string, string> = {
    "Normal": "text-zinc-400",
    "Alta": "text-yellow-400",
    "Urgente": "text-red-400",
  };

  const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2.5 text-white text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1";

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Comunicados</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Mensajes y avisos para el personal</p>
        </div>
        {!esEmpleado && (
          <button onClick={() => setMostrarForm(true)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition">+ Nuevo comunicado</button>
        )}
      </div>

      {comunicados.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-500 text-sm">Sin comunicados activos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comunicados.map(c => (
            <div key={c.id} className={"rounded-2xl border p-4 " + (PRIORIDAD_STYLE[c.prioridad] || "border-zinc-800 bg-zinc-950")}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase">{c.tipo}</span>
                    <span className={"text-xs font-bold " + (PRIORIDAD_BADGE[c.prioridad] || "text-zinc-400")}>{c.prioridad !== "Normal" ? "● " + c.prioridad : ""}</span>
                  </div>
                  <p className="font-bold text-white">{c.titulo}</p>
                </div>
                <p className="text-xs text-zinc-600 flex-shrink-0">{new Date(c.created_at).toLocaleDateString("es-EC")}</p>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{c.contenido}</p>
              <p className="text-xs text-zinc-600 mt-2">Por: {c.creado_por}</p>
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-6 max-w-lg w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Nuevo Comunicado</h2>
              <button onClick={() => setMostrarForm(false)} className="text-zinc-400 hover:text-white text-xl font-bold">X</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Tipo</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className={inputClass}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className={labelClass}>Prioridad</label><select value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})} className={inputClass}>{PRIORIDADES.map(p => <option key={p}>{p}</option>)}</select></div>
              </div>
              <div><label className={labelClass}>Titulo *</label><input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className={inputClass} spellCheck /></div>
              <div><label className={labelClass}>Contenido *</label><textarea value={form.contenido} onChange={e => setForm({...form, contenido: e.target.value})} className={inputClass + " resize-none"} rows={4} spellCheck /></div>
              <div><label className={labelClass}>Publicado por</label><input value={form.creado_por} onChange={e => setForm({...form, creado_por: e.target.value})} className={inputClass} /></div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={form.enviar_whatsapp} onChange={e => setForm({...form, enviar_whatsapp: e.target.checked})} className="w-4 h-4 accent-blue-600" id="wa" />
                <label htmlFor="wa" className="text-sm text-zinc-300">Enviar tambien por WhatsApp al grupo</label>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setMostrarForm(false)} className="flex-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-3 text-sm font-bold text-zinc-300 transition">Cancelar</button>
                <button onClick={publicar} disabled={guardando} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-bold text-white transition disabled:opacity-50">{guardando ? "Publicando..." : "Publicar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
