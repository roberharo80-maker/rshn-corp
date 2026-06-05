"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

export default function PerfilEmpleado({ empleadoNombre }: { empleadoNombre?: string }) {
  const [datos, setDatos] = useState<any>(null);
  const [turnos, setTurnos] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"resumen"|"historial"|"comunicados">("resumen");

  useEffect(() => { if (empleadoNombre) cargar(); }, [empleadoNombre]);

  async function cargar() {
    setCargando(true);
    const [{ data: emp }, { data: ts }, { data: als }, { data: comms }] = await Promise.all([
      supabase.from("corp_empleados").select("*").ilike("nombre", "%" + (empleadoNombre?.split(" ")[0] || "") + "%").maybeSingle(),
      supabase.from("corp_turnos").select("*").eq("empleado_nombre", empleadoNombre).order("fecha", { ascending: false }).limit(30),
      supabase.from("corp_alertas").select("*").eq("empleado_nombre", empleadoNombre).order("created_at", { ascending: false }).limit(5),
      supabase.from("corp_comunicados").select("*").eq("activo", true).order("created_at", { ascending: false }).limit(5),
    ]);
    if (emp) setDatos(emp);
    if (ts) setTurnos(ts);
    if (als) setAlertas(als);
    if (comms) setComunicados(comms);
    setCargando(false);
  }

  if (cargando) return <div className="text-zinc-500 text-sm p-4">Cargando perfil...</div>;

  const presentes = turnos.filter(t => t.estado !== "ausente").length;
  const tardanzas = turnos.filter(t => t.tardanza).length;
  const tasa = turnos.length > 0 ? Math.round((presentes / turnos.length) * 100) : 0;
  const horas = turnos.reduce((a, t) => {
    if (t.hora_entrada_real && t.hora_salida_real) {
      const [eh, em] = t.hora_entrada_real.split(":").map(Number);
      const [sh, sm] = t.hora_salida_real.split(":").map(Number);
      return a + (sh * 60 + sm - eh * 60 - em) / 60;
    }
    return a;
  }, 0);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-900 flex items-center justify-center text-3xl font-black text-blue-300">
            {(empleadoNombre || "E").charAt(0)}
          </div>
          <div>
            <p className="text-xl font-bold text-white">{empleadoNombre}</p>
            <p className="text-sm text-zinc-400">{datos?.cargo || "Empleado"} · {datos?.zona_trabajo || "Sin zona"}</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-950 text-green-400">{datos?.estado || "Activo"}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Cedula", value: datos?.cedula || "No registrada" },
            { label: "Telefono", value: datos?.telefono || "No registrado" },
            { label: "Horario", value: (datos?.hora_entrada || "—") + " — " + (datos?.hora_salida || "—") },
            { label: "Empresa", value: datos?.empresa || "Sin empresa" },
          ].map(f => (
            <div key={f.label} className="rounded-xl bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500">{f.label}</p>
              <p className="text-sm font-semibold text-white mt-1">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Asistencia", value: tasa + "%", color: tasa >= 90 ? "text-green-400" : tasa >= 70 ? "text-yellow-400" : "text-red-400" },
          { label: "Horas totales", value: Math.round(horas * 10) / 10 + "h", color: "text-blue-400" },
          { label: "Tardanzas", value: tardanzas, color: tardanzas > 3 ? "text-red-400" : "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={"text-2xl font-bold mt-1 " + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {([["resumen","Resumen"],["historial","Historial"],["comunicados","Comunicados"]] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={"px-4 py-2 rounded-xl text-sm font-bold transition " + (tab === k ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-white mb-4">Actividad reciente</p>
          {turnos.slice(0, 7).map((t, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
              <div>
                <p className="text-sm text-white">{t.fecha}</p>
                <p className="text-xs text-zinc-500">{t.zona_trabajo}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-300">{t.hora_entrada_real || "—"} → {t.hora_salida_real || "—"}</p>
                {t.tardanza && <p className="text-xs text-yellow-400">+{t.minutos_tardanza}min tarde</p>}
                <span className={"text-xs font-bold " + (t.estado === "salio" || t.estado === "presente" ? "text-green-400" : "text-red-400")}>{t.estado}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "historial" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-white mb-4">Historial completo ({turnos.length} registros)</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {turnos.map((t, i) => (
              <div key={i} className={"rounded-xl p-3 border " + (t.estado === "ausente" ? "border-red-900 bg-red-950/10" : t.tardanza ? "border-yellow-900 bg-yellow-950/10" : "border-zinc-800 bg-zinc-900")}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{t.fecha}</p>
                  <span className={"text-xs font-bold " + (t.estado === "ausente" ? "text-red-400" : t.tardanza ? "text-yellow-400" : "text-green-400")}>
                    {t.estado === "ausente" ? "Ausente" : t.tardanza ? "+"+t.minutos_tardanza+"min" : "Puntual"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{t.hora_entrada_real || "—"} → {t.hora_salida_real || "—"} · {t.zona_trabajo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "comunicados" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-white mb-4">Comunicados activos</p>
          {comunicados.length === 0 ? <p className="text-zinc-500 text-sm">Sin comunicados.</p> : (
            <div className="space-y-3">
              {comunicados.map((c, i) => (
                <div key={i} className="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-zinc-500 uppercase">{c.tipo}</span>
                    {c.prioridad !== "Normal" && <span className="text-xs font-bold text-yellow-400">● {c.prioridad}</span>}
                  </div>
                  <p className="text-sm font-bold text-white">{c.titulo}</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{c.contenido}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
