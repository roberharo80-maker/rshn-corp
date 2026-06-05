"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

type ReporteProductividad = {
  empleado_nombre: string;
  zona_trabajo: string;
  dias_trabajados: number;
  horas_trabajadas: number;
  horas_programadas: number;
  porcentaje_cumplimiento: number;
  dias_puntual: number;
  tardanzas: number;
  ausencias: number;
  en_zona_porcentaje: number;
  puntuacion: number;
};

function colorPuntuacion(p: number) {
  if (p >= 90) return "text-green-400";
  if (p >= 70) return "text-yellow-400";
  if (p >= 50) return "text-orange-400";
  return "text-red-400";
}

function bgPuntuacion(p: number) {
  if (p >= 90) return "bg-green-500";
  if (p >= 70) return "bg-yellow-400";
  if (p >= 50) return "bg-orange-400";
  return "bg-red-500";
}

function nivelProductividad(p: number) {
  if (p >= 90) return "Excelente";
  if (p >= 70) return "Bueno";
  if (p >= 50) return "Regular";
  return "Deficiente";
}

export default function Productividad() {
  const [reportes, setReportes] = useState<ReporteProductividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState("mes");
  const [seleccionado, setSeleccionado] = useState<ReporteProductividad | null>(null);

  useEffect(() => { cargar(); }, [periodo]);

  async function cargar() {
    setCargando(true);
    const ahora = new Date();
    let desde = new Date();
    if (periodo === "semana") desde.setDate(ahora.getDate() - 7);
    else if (periodo === "mes") desde.setMonth(ahora.getMonth() - 1);
    else desde.setMonth(ahora.getMonth() - 3);

    const { data } = await supabase.from("corp_turnos").select("*").gte("fecha", desde.toISOString().slice(0, 10));
    if (!data) { setCargando(false); return; }

    const agrupado: Record<string, ReporteProductividad> = {};
    data.forEach(t => {
      if (!agrupado[t.empleado_nombre]) {
        agrupado[t.empleado_nombre] = {
          empleado_nombre: t.empleado_nombre, zona_trabajo: t.zona_trabajo || "",
          dias_trabajados: 0, horas_trabajadas: 0, horas_programadas: 0,
          porcentaje_cumplimiento: 0, dias_puntual: 0, tardanzas: 0,
          ausencias: 0, en_zona_porcentaje: 0, puntuacion: 0,
        };
      }
      const r = agrupado[t.empleado_nombre];
      r.dias_trabajados++;
      if (t.estado === "ausente") r.ausencias++;
      else if (t.tardanza) r.tardanzas++;
      else r.dias_puntual++;
      if (t.hora_entrada_real && t.hora_salida_real) {
        const [eh, em] = t.hora_entrada_real.split(":").map(Number);
        const [sh, sm] = t.hora_salida_real.split(":").map(Number);
        r.horas_trabajadas += (sh * 60 + sm - eh * 60 - em) / 60;
      }
      if (t.hora_entrada_prog && t.hora_salida_prog) {
        const [ph, pm] = t.hora_entrada_prog.split(":").map(Number);
        const [qh, qm] = t.hora_salida_prog.split(":").map(Number);
        r.horas_programadas += (qh * 60 + qm - ph * 60 - pm) / 60;
      }
    });

    const resultado = Object.values(agrupado).map(r => {
      const puntualidad = r.dias_trabajados > 0 ? (r.dias_puntual / r.dias_trabajados) * 100 : 0;
      const cumplimiento = r.horas_programadas > 0 ? (r.horas_trabajadas / r.horas_programadas) * 100 : 0;
      const asistencia = r.dias_trabajados > 0 ? ((r.dias_trabajados - r.ausencias) / r.dias_trabajados) * 100 : 0;
      return {
        ...r,
        horas_trabajadas: Math.round(r.horas_trabajadas * 10) / 10,
        horas_programadas: Math.round(r.horas_programadas * 10) / 10,
        porcentaje_cumplimiento: Math.round(cumplimiento),
        puntuacion: Math.round((puntualidad * 0.4 + cumplimiento * 0.4 + asistencia * 0.2)),
      };
    }).sort((a, b) => b.puntuacion - a.puntuacion);

    setReportes(resultado);
    setCargando(false);
  }

  const promedio = reportes.length > 0 ? Math.round(reportes.reduce((a, r) => a + r.puntuacion, 0) / reportes.length) : 0;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Reporte de Productividad</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Puntuacion integral por empleado</p>
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
        {[
          { label: "Productividad promedio", value: promedio + "%", color: colorPuntuacion(promedio) },
          { label: "Nivel excelente", value: reportes.filter(r => r.puntuacion >= 90).length, color: "text-green-400" },
          { label: "Requieren atencion", value: reportes.filter(r => r.puntuacion < 70).length, color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase">{s.label}</p>
            <p className={"text-3xl font-bold mt-1 " + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      {cargando ? <p className="text-zinc-500 text-sm">Cargando...</p> :
      reportes.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-500 text-sm">Sin datos en este periodo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reportes.map((r, i) => (
            <div key={i} onClick={() => setSeleccionado(r)} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-600 transition cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-600 w-6">{i + 1}</span>
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-zinc-300">{r.empleado_nombre.charAt(0)}</div>
                  <div>
                    <p className="font-bold text-white group-hover:text-blue-400 transition">{r.empleado_nombre}</p>
                    <p className="text-xs text-zinc-500">{r.zona_trabajo} · {nivelProductividad(r.puntuacion)}</p>
                  </div>
                </div>
                <p className={"text-2xl font-bold " + colorPuntuacion(r.puntuacion)}>{r.puntuacion}%</p>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                <div className={"h-full rounded-full " + bgPuntuacion(r.puntuacion)} style={{ width: r.puntuacion + "%" }} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Dias", value: r.dias_trabajados },
                  { label: "Horas", value: r.horas_trabajadas + "h" },
                  { label: "Puntual", value: r.dias_puntual },
                  { label: "Ausencias", value: r.ausencias },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-zinc-900 p-2 text-center">
                    <p className="text-xs text-zinc-600">{s.label}</p>
                    <p className="text-sm font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {seleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Detalle de Productividad</h2>
              <button onClick={() => setSeleccionado(null)} className="text-zinc-400 hover:text-white text-xl font-bold">X</button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl font-black text-zinc-300">{seleccionado.empleado_nombre.charAt(0)}</div>
              <div>
                <p className="font-bold text-white text-lg">{seleccionado.empleado_nombre}</p>
                <p className="text-sm text-zinc-400">{seleccionado.zona_trabajo}</p>
                <p className={"text-sm font-bold " + colorPuntuacion(seleccionado.puntuacion)}>{nivelProductividad(seleccionado.puntuacion)} — {seleccionado.puntuacion}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Dias trabajados", value: seleccionado.dias_trabajados },
                { label: "Horas trabajadas", value: seleccionado.horas_trabajadas + "h" },
                { label: "Horas programadas", value: seleccionado.horas_programadas + "h" },
                { label: "Cumplimiento horario", value: seleccionado.porcentaje_cumplimiento + "%" },
                { label: "Dias puntual", value: seleccionado.dias_puntual },
                { label: "Tardanzas", value: seleccionado.tardanzas },
                { label: "Ausencias", value: seleccionado.ausencias },
                { label: "Puntuacion final", value: seleccionado.puntuacion + "%" },
              ].map(f => (
                <div key={f.label} className="rounded-xl bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">{f.label}</p>
                  <p className="text-sm font-bold text-white mt-1">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
