"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

type RegistroPuntualidad = {
  empleado_nombre: string;
  total_dias: number;
  dias_puntual: number;
  dias_tardanza: number;
  dias_ausente: number;
  minutos_tardanza_total: number;
  tasa_puntualidad: number;
};

export default function Puntualidad() {
  const [registros, setRegistros] = useState<RegistroPuntualidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState("mes");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => { cargar(); }, [periodo]);

  async function cargar() {
    setCargando(true);
    const ahora = new Date();
    let desde = new Date();
    if (periodo === "semana") desde.setDate(ahora.getDate() - 7);
    else if (periodo === "mes") desde.setMonth(ahora.getMonth() - 1);
    else desde.setMonth(ahora.getMonth() - 3);

    const { data } = await supabase.from("corp_turnos").select("*")
      .gte("fecha", desde.toISOString().slice(0, 10))
      .order("empleado_nombre");

    if (!data) { setCargando(false); return; }

    const agrupado: Record<string, RegistroPuntualidad> = {};
    data.forEach(t => {
      if (!agrupado[t.empleado_nombre]) {
        agrupado[t.empleado_nombre] = {
          empleado_nombre: t.empleado_nombre,
          total_dias: 0, dias_puntual: 0, dias_tardanza: 0,
          dias_ausente: 0, minutos_tardanza_total: 0, tasa_puntualidad: 0,
        };
      }
      const r = agrupado[t.empleado_nombre];
      r.total_dias++;
      if (t.estado === "ausente") r.dias_ausente++;
      else if (t.tardanza) { r.dias_tardanza++; r.minutos_tardanza_total += t.minutos_tardanza || 0; }
      else r.dias_puntual++;
    });

    const resultado = Object.values(agrupado).map(r => ({
      ...r,
      tasa_puntualidad: r.total_dias > 0 ? Math.round((r.dias_puntual / r.total_dias) * 100) : 0,
    })).sort((a, b) => b.tasa_puntualidad - a.tasa_puntualidad);

    setRegistros(resultado);
    setCargando(false);
  }

  const filtrados = registros.filter(r => r.empleado_nombre.toLowerCase().includes(busqueda.toLowerCase()));

  function colorTasa(tasa: number) {
    if (tasa >= 90) return "text-green-400";
    if (tasa >= 70) return "text-yellow-400";
    return "text-red-400";
  }

  function bgTasa(tasa: number) {
    if (tasa >= 90) return "bg-green-500";
    if (tasa >= 70) return "bg-yellow-400";
    return "bg-red-500";
  }

  const promedio = registros.length > 0 ? Math.round(registros.reduce((a, r) => a + r.tasa_puntualidad, 0) / registros.length) : 0;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Control de Puntualidad</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Historial de asistencia y tardanzas por empleado</p>
        </div>
        <div className="flex gap-2">
          {["semana", "mes", "trimestre"].map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={"px-3 py-1.5 rounded-xl text-xs font-bold transition " + (periodo === p ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white")}>
              {p === "semana" ? "7 dias" : p === "mes" ? "30 dias" : "90 dias"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Puntualidad promedio</p>
          <p className={"text-3xl font-bold mt-1 " + colorTasa(promedio)}>{promedio}%</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Empleados perfectos</p>
          <p className="text-3xl font-bold mt-1 text-green-400">{registros.filter(r => r.tasa_puntualidad === 100).length}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Con problemas</p>
          <p className="text-3xl font-bold mt-1 text-red-400">{registros.filter(r => r.tasa_puntualidad < 70).length}</p>
        </div>
      </div>

      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar empleado..."
        className="w-full mb-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />

      {cargando ? <p className="text-zinc-500 text-sm">Cargando...</p> :
      filtrados.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-500 text-sm">Sin registros en este periodo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((r, i) => (
            <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-600 w-6 text-center">{i + 1}</span>
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-300">{r.empleado_nombre.charAt(0)}</div>
                  <p className="font-bold text-white">{r.empleado_nombre}</p>
                </div>
                <p className={"text-2xl font-bold " + colorTasa(r.tasa_puntualidad)}>{r.tasa_puntualidad}%</p>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                <div className={"h-full rounded-full " + bgTasa(r.tasa_puntualidad)} style={{ width: r.tasa_puntualidad + "%" }} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Puntual", value: r.dias_puntual, color: "text-green-400" },
                  { label: "Tardanza", value: r.dias_tardanza, color: "text-yellow-400" },
                  { label: "Ausente", value: r.dias_ausente, color: "text-red-400" },
                  { label: "Min retraso", value: r.minutos_tardanza_total, color: "text-orange-400" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-zinc-900 p-2 text-center">
                    <p className="text-xs text-zinc-600">{s.label}</p>
                    <p className={"text-sm font-bold " + s.color}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
