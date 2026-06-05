"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

type Turno = {
  id: number; empleado_id: number; empleado_nombre: string; zona_trabajo: string;
  fecha: string; hora_entrada_prog: string; hora_salida_prog: string;
  hora_entrada_real: string | null; hora_salida_real: string | null;
  tardanza: boolean; minutos_tardanza: number; estado: string; en_zona: boolean;
  observaciones: string;
};

function minutosEntreFechas(prog: string, real: string): number {
  const [ph, pm] = prog.split(":").map(Number);
  const [rh, rm] = real.split(":").map(Number);
  return (rh * 60 + rm) - (ph * 60 + pm);
}

export default function ControlTurnos() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [filtro, setFiltro] = useState("Todos");

  useEffect(() => { cargar(); }, [fecha]);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("corp_turnos").select("*").eq("fecha", fecha).order("empleado_nombre");
    if (data) setTurnos(data);
    setCargando(false);
  }

  async function registrarEntrada(turno: Turno) {
    const ahora = new Date().toTimeString().slice(0, 5);
    const minutos = minutosEntreFechas(turno.hora_entrada_prog, ahora);
    const tardanza = minutos > 10;
    await supabase.from("corp_turnos").update({
      hora_entrada_real: ahora,
      tardanza,
      minutos_tardanza: tardanza ? minutos : 0,
      estado: "presente",
    }).eq("id", turno.id);
    if (tardanza) {
      await supabase.from("corp_alertas").insert([{
        empleado_nombre: turno.empleado_nombre,
        tipo: "Tardanza",
        descripcion: minutos + " minutos de retraso",
        resuelta: false,
      }]);
      await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: "⏰ *TARDANZA DETECTADA - RSHN CORP*\n\nEmpleado: *" + turno.empleado_nombre + "*\nZona: " + turno.zona_trabajo + "\nHora programada: " + turno.hora_entrada_prog + "\nHora de llegada: " + ahora + "\nRetraso: *" + minutos + " minutos*\n\n_RSHN CORP - Control Laboral_",
          grupo: true,
        }),
      }).catch(() => {});
    }
    await cargar();
  }

  async function registrarSalida(turno: Turno) {
    const ahora = new Date().toTimeString().slice(0, 5);
    await supabase.from("corp_turnos").update({ hora_salida_real: ahora, estado: "salio" }).eq("id", turno.id);
    await cargar();
  }

  const filtrados = filtro === "Todos" ? turnos : turnos.filter(t => t.estado === filtro);
  const presentes = turnos.filter(t => t.estado === "presente").length;
  const ausentes = turnos.filter(t => t.estado === "ausente").length;
  const tardanzas = turnos.filter(t => t.tardanza).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Control de Turnos</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Registro de entradas y salidas del personal</p>
        </div>
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Presentes", value: presentes, color: "text-green-400" },
          { label: "Ausentes", value: ausentes, color: "text-red-400" },
          { label: "Tardanzas", value: tardanzas, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase">{s.label}</p>
            <p className={"text-3xl font-bold mt-1 " + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["Todos", "presente", "ausente", "salio"].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={"px-3 py-1.5 rounded-xl text-xs font-bold transition border " + (filtro === f ? "bg-blue-600 border-blue-500 text-white" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500")}>
            {f === "Todos" ? "Todos" : f === "presente" ? "Presentes" : f === "ausente" ? "Ausentes" : "Salieron"}
          </button>
        ))}
      </div>

      {cargando ? <p className="text-zinc-500 text-sm">Cargando...</p> :
      turnos.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-500 text-sm">No hay turnos registrados para esta fecha.</p>
          <p className="text-zinc-600 text-xs mt-1">Los turnos se generan automaticamente cuando los empleados marcan entrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(t => (
            <div key={t.id} className={"rounded-2xl border p-4 " + (t.estado === "presente" ? "border-green-900 bg-green-950/10" : t.estado === "ausente" ? "border-red-900 bg-red-950/10" : "border-zinc-800 bg-zinc-950")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-300">{t.empleado_nombre.charAt(0)}</div>
                  <div>
                    <p className="font-bold text-white">{t.empleado_nombre}</p>
                    <p className="text-xs text-zinc-500">{t.zona_trabajo} · Horario: {t.hora_entrada_prog} — {t.hora_salida_prog}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.tardanza && <span className="text-xs text-yellow-400 font-bold">⚠ +{t.minutos_tardanza}min</span>}
                  {t.estado === "ausente" && !t.hora_entrada_real && (
                    <button onClick={() => registrarEntrada(t)} className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold text-white transition">
                      Registrar entrada
                    </button>
                  )}
                  {t.estado === "presente" && !t.hora_salida_real && (
                    <button onClick={() => registrarSalida(t)} className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs font-bold text-white transition">
                      Registrar salida
                    </button>
                  )}
                  <span className={"text-xs font-bold px-2 py-1 rounded-lg " + (t.estado === "presente" ? "bg-green-950 text-green-400" : t.estado === "ausente" ? "bg-red-950 text-red-400" : "bg-zinc-800 text-zinc-400")}>
                    {t.estado === "presente" ? "Presente" : t.estado === "ausente" ? "Ausente" : "Salio"}
                  </span>
                </div>
              </div>
              {(t.hora_entrada_real || t.hora_salida_real) && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-zinc-800">
                  {t.hora_entrada_real && <p className="text-xs text-zinc-400">Entrada real: <span className="text-white font-bold">{t.hora_entrada_real}</span></p>}
                  {t.hora_salida_real && <p className="text-xs text-zinc-400">Salida real: <span className="text-white font-bold">{t.hora_salida_real}</span></p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
