"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

type RegistroHoras = {
  empleado_nombre: string;
  zona_trabajo: string;
  horas_programadas: number;
  horas_trabajadas: number;
  horas_extra: number;
  horas_faltantes: number;
  dias: number;
};

export default function HorasExtra() {
  const [registros, setRegistros] = useState<RegistroHoras[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState("mes");

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
      .not("hora_entrada_real", "is", null);

    if (!data) { setCargando(false); return; }

    const agrupado: Record<string, RegistroHoras> = {};
    data.forEach(t => {
      if (!agrupado[t.empleado_nombre]) {
        agrupado[t.empleado_nombre] = {
          empleado_nombre: t.empleado_nombre, zona_trabajo: t.zona_trabajo || "",
          horas_programadas: 0, horas_trabajadas: 0,
          horas_extra: 0, horas_faltantes: 0, dias: 0,
        };
      }
      const r = agrupado[t.empleado_nombre];
      r.dias++;
      if (t.hora_entrada_prog && t.hora_salida_prog) {
        const [ph, pm] = t.hora_entrada_prog.split(":").map(Number);
        const [qh, qm] = t.hora_salida_prog.split(":").map(Number);
        r.horas_programadas += (qh * 60 + qm - ph * 60 - pm) / 60;
      }
      if (t.hora_entrada_real && t.hora_salida_real) {
        const [eh, em] = t.hora_entrada_real.split(":").map(Number);
        const [sh, sm] = t.hora_salida_real.split(":").map(Number);
        r.horas_trabajadas += (sh * 60 + sm - eh * 60 - em) / 60;
      }
    });

    const resultado = Object.values(agrupado).map(r => ({
      ...r,
      horas_programadas: Math.round(r.horas_programadas * 10) / 10,
      horas_trabajadas: Math.round(r.horas_trabajadas * 10) / 10,
      horas_extra: Math.max(0, Math.round((r.horas_trabajadas - r.horas_programadas) * 10) / 10),
      horas_faltantes: Math.max(0, Math.round((r.horas_programadas - r.horas_trabajadas) * 10) / 10),
    })).sort((a, b) => b.horas_extra - a.horas_extra);

    setRegistros(resultado);
    setCargando(false);
  }

  const totalExtra = registros.reduce((a, r) => a + r.horas_extra, 0);
  const totalFaltantes = registros.reduce((a, r) => a + r.horas_faltantes, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Control de Horas</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Horas trabajadas, extra y faltantes por empleado</p>
        </div>
        <div className="flex gap-2">
          {["semana","mes","trimestre"].map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={"px-3 py-1.5 rounded-xl text-xs font-bold transition " + (periodo === p ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white")}>
              {p === "semana" ? "7 dias" : p === "mes" ? "30 dias" : "90 dias"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total horas extra</p>
          <p className="text-3xl font-bold mt-1 text-blue-400">{Math.round(totalExtra * 10) / 10}h</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Horas faltantes</p>
          <p className="text-3xl font-bold mt-1 text-red-400">{Math.round(totalFaltantes * 10) / 10}h</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Empleados con extra</p>
          <p className="text-3xl font-bold mt-1 text-green-400">{registros.filter(r => r.horas_extra > 0).length}</p>
        </div>
      </div>

      {cargando ? <p className="text-zinc-500 text-sm">Cargando...</p> :
      registros.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-500 text-sm">Sin registros en este periodo.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>{["Empleado","Zona","Dias","Horas prog.","Horas trab.","Extra","Faltantes"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {registros.map((r, i) => (
                <tr key={i} className="hover:bg-zinc-900 transition">
                  <td className="px-4 py-3 text-white font-medium">{r.empleado_nombre}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{r.zona_trabajo}</td>
                  <td className="px-4 py-3 text-zinc-300">{r.dias}</td>
                  <td className="px-4 py-3 text-zinc-300">{r.horas_programadas}h</td>
                  <td className="px-4 py-3 text-zinc-300">{r.horas_trabajadas}h</td>
                  <td className="px-4 py-3"><span className={r.horas_extra > 0 ? "text-blue-400 font-bold" : "text-zinc-600"}>{r.horas_extra > 0 ? "+" + r.horas_extra + "h" : "—"}</span></td>
                  <td className="px-4 py-3"><span className={r.horas_faltantes > 0 ? "text-red-400 font-bold" : "text-zinc-600"}>{r.horas_faltantes > 0 ? "-" + r.horas_faltantes + "h" : "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
