"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

export default function ReportesCorp() {
  const [desde, setDesde] = useState(new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10));
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0,10));
  const [turnos, setTurnos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [tab, setTab] = useState<"resumen"|"detalle">("resumen");

  useEffect(() => { cargar(); }, [desde, hasta]);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("corp_turnos").select("*").gte("fecha", desde).lte("fecha", hasta).order("fecha", { ascending: false });
    if (data) setTurnos(data);
    setCargando(false);
  }

  function exportarPDF() {
    const ventana = window.open("", "_blank");
    if (!ventana) return;
    const filas = turnos.map(t =>
      `<tr><td>${t.empleado_nombre}</td><td>${t.zona_trabajo}</td><td>${t.fecha}</td><td>${t.hora_entrada_real || "—"}</td><td>${t.hora_salida_real || "—"}</td><td>${t.tardanza ? "Sí (" + t.minutos_tardanza + "min)" : "No"}</td><td>${t.estado}</td></tr>`
    ).join("");
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Reporte RSHN CORP</title>
    <style>@page{margin:20mm}body{font-family:Arial,sans-serif;font-size:10px}
    .header{border-bottom:2px solid #1d4ed8;padding-bottom:12px;margin-bottom:20px}
    .logo{font-size:20px;font-weight:900;color:#1d4ed8}
    table{width:100%;border-collapse:collapse}th{background:#1d4ed8;color:#fff;padding:6px;text-align:left;font-size:9px}
    td{padding:5px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f8f8f8}
    .footer{margin-top:20px;border-top:1px solid #ddd;padding-top:8px;font-size:9px;color:#888}</style></head><body>
    <div class="header"><div class="logo">RSHN CORP</div><div>Control de Fuerza Laboral</div>
    <div>Periodo: ${desde} al ${hasta} · Generado: ${new Date().toLocaleString("es-EC")}</div></div>
    <table><thead><tr><th>Empleado</th><th>Zona</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Tardanza</th><th>Estado</th></tr></thead>
    <tbody>${filas}</tbody></table>
    <div class="footer"><span>RSHN CORP - Sistema de Control Laboral</span></div>
    </body></html>`);
    ventana.document.close();
    setTimeout(() => ventana.print(), 500);
  }

  function exportarCSV() {
    const header = "Empleado,Zona,Fecha,Entrada Programada,Salida Programada,Entrada Real,Salida Real,Tardanza,Minutos Retraso,Estado\n";
    const filas = turnos.map(t =>
      `${t.empleado_nombre},${t.zona_trabajo},${t.fecha},${t.hora_entrada_prog},${t.hora_salida_prog},${t.hora_entrada_real || ""},${t.hora_salida_real || ""},${t.tardanza ? "Si" : "No"},${t.minutos_tardanza || 0},${t.estado}`
    ).join("\n");
    const blob = new Blob([header + filas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "reporte_rshn_corp_" + desde + "_" + hasta + ".csv";
    a.click();
  }

  const presentes = turnos.filter(t => t.estado === "presente" || t.estado === "salio").length;
  const ausentes = turnos.filter(t => t.estado === "ausente").length;
  const tardanzas = turnos.filter(t => t.tardanza).length;
  const totalMinRetraso = turnos.reduce((a, t) => a + (t.minutos_tardanza || 0), 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Reportes</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{turnos.length} registros en el periodo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarPDF} className="px-3 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white transition">PDF</button>
          <button onClick={exportarCSV} className="px-3 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-xs font-bold text-white transition">CSV</button>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Desde:</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Hasta:</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Asistencias", value: presentes, color: "text-green-400" },
          { label: "Ausencias", value: ausentes, color: "text-red-400" },
          { label: "Tardanzas", value: tardanzas, color: "text-yellow-400" },
          { label: "Min retraso total", value: totalMinRetraso, color: "text-orange-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase">{s.label}</p>
            <p className={"text-3xl font-bold mt-1 " + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {[{k:"resumen",l:"Resumen"},{k:"detalle",l:"Detalle"}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={"px-4 py-2 rounded-xl text-sm font-bold transition " + (tab === t.k ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white")}>{t.l}</button>
        ))}
      </div>

      {cargando ? <p className="text-zinc-500 text-sm">Cargando...</p> : (
        tab === "detalle" ? (
          <div className="rounded-2xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>{["Empleado","Zona","Fecha","Entrada","Salida","Tardanza","Estado"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {turnos.map((t, i) => (
                  <tr key={i} className="hover:bg-zinc-900 transition">
                    <td className="px-4 py-3 text-white font-medium">{t.empleado_nombre}</td>
                    <td className="px-4 py-3 text-zinc-400">{t.zona_trabajo}</td>
                    <td className="px-4 py-3 text-zinc-400">{t.fecha}</td>
                    <td className="px-4 py-3 text-zinc-300">{t.hora_entrada_real || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">{t.hora_salida_real || "—"}</td>
                    <td className="px-4 py-3">{t.tardanza ? <span className="text-yellow-400 text-xs font-bold">+{t.minutos_tardanza}min</span> : <span className="text-green-400 text-xs">✓</span>}</td>
                    <td className="px-4 py-3"><span className={"text-xs font-bold px-2 py-0.5 rounded-lg " + (t.estado === "presente" || t.estado === "salio" ? "bg-green-950 text-green-400" : "bg-red-950 text-red-400")}>{t.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm font-bold text-white mb-4">Resumen del periodo {desde} — {hasta}</p>
            <div className="space-y-3">
              {[
                { label: "Total registros", value: turnos.length },
                { label: "Tasa de asistencia", value: turnos.length > 0 ? Math.round((presentes / turnos.length) * 100) + "%" : "0%" },
                { label: "Tasa de puntualidad", value: presentes > 0 ? Math.round(((presentes - tardanzas) / presentes) * 100) + "%" : "0%" },
                { label: "Promedio retraso", value: tardanzas > 0 ? Math.round(totalMinRetraso / tardanzas) + " min" : "0 min" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <p className="text-sm text-zinc-400">{item.label}</p>
                  <p className="text-sm font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </>
  );
}
