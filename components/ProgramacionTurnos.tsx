"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

type Empleado = { id: number; nombre: string; cargo: string; zona_trabajo: string; hora_entrada: string; hora_salida: string; };
type Turno = { empleado_id: number; empleado_nombre: string; fecha: string; hora_entrada_prog: string; hora_salida_prog: string; zona_trabajo: string; estado: string; };

function getDias(inicio: string, dias: number): string[] {
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function nombreDia(fecha: string): string {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-EC", { weekday: "short", day: "numeric" });
}

export default function ProgramacionTurnos() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [semanaInicio, setSemanaInicio] = useState(() => {
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    return lunes.toISOString().slice(0, 10);
  });
  const [publicando, setPublicando] = useState(false);
  const [publicado, setPublicado] = useState(false);
  const [modal, setModal] = useState<{ empleado: Empleado; fecha: string } | null>(null);
  const [formTurno, setFormTurno] = useState({ entrada: "08:00", salida: "17:00", zona: "" });

  const dias = getDias(semanaInicio, 7);

  useEffect(() => { cargar(); }, [semanaInicio]);

  async function cargar() {
    const [{ data: emps }, { data: ts }] = await Promise.all([
      supabase.from("corp_empleados").select("*").eq("estado", "Activo").order("nombre"),
      supabase.from("corp_turnos").select("*").gte("fecha", dias[0]).lte("fecha", dias[6]),
    ]);
    if (emps) setEmpleados(emps);
    if (ts) setTurnos(ts);
  }

  function getTurno(empId: number, fecha: string) {
    return turnos.find(t => t.empleado_id === empId && t.fecha === fecha);
  }

  function abrirModal(emp: Empleado, fecha: string) {
    setModal({ empleado: emp, fecha });
    setFormTurno({ entrada: emp.hora_entrada || "08:00", salida: emp.hora_salida || "17:00", zona: emp.zona_trabajo || "" });
  }

  async function guardarTurno() {
    if (!modal) return;
    const existente = getTurno(modal.empleado.id, modal.fecha);
    if (existente) {
      await supabase.from("corp_turnos").update({
        hora_entrada_prog: formTurno.entrada,
        hora_salida_prog: formTurno.salida,
        zona_trabajo: formTurno.zona,
      }).eq("empleado_id", modal.empleado.id).eq("fecha", modal.fecha);
    } else {
      await supabase.from("corp_turnos").insert([{
        empleado_id: modal.empleado.id,
        empleado_nombre: modal.empleado.nombre,
        fecha: modal.fecha,
        hora_entrada_prog: formTurno.entrada,
        hora_salida_prog: formTurno.salida,
        zona_trabajo: formTurno.zona,
        estado: "ausente",
      }]);
    }
    setModal(null);
    await cargar();
  }

  async function eliminarTurno(empId: number, fecha: string) {
    await supabase.from("corp_turnos").delete().eq("empleado_id", empId).eq("fecha", fecha);
    await cargar();
  }

  async function programarSemanaCompleta() {
    setPublicando(true);
    const inserts: any[] = [];
    empleados.forEach(emp => {
      dias.forEach(fecha => {
        const dia = new Date(fecha + "T12:00:00").getDay();
        if (dia === 0 || dia === 6) return; // sin fines de semana por defecto
        const existente = getTurno(emp.id, fecha);
        if (!existente) {
          inserts.push({
            empleado_id: emp.id,
            empleado_nombre: emp.nombre,
            fecha,
            hora_entrada_prog: emp.hora_entrada || "08:00",
            hora_salida_prog: emp.hora_salida || "17:00",
            zona_trabajo: emp.zona_trabajo,
            estado: "ausente",
          });
        }
      });
    });
    if (inserts.length > 0) await supabase.from("corp_turnos").insert(inserts);
    await fetch("/api/whatsapp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensaje: "📅 *HORARIO SEMANAL PUBLICADO - RSHN CORP*\n\nSemana del " + dias[0] + " al " + dias[4] + "\n" +
          empleados.length + " empleados programados\n\n_Revisa tu turno en el sistema_",
        grupo: true,
      }),
    }).catch(() => {});
    setPublicando(false);
    setPublicado(true);
    setTimeout(() => setPublicado(false), 3000);
    await cargar();
  }

  const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-white text-sm focus:outline-none focus:border-blue-500";

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Programacion de Turnos</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Planificacion semanal del personal</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" value={semanaInicio} onChange={e => setSemanaInicio(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          <button onClick={programarSemanaCompleta} disabled={publicando}
            className={"px-4 py-2 rounded-xl text-sm font-bold transition " + (publicado ? "bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50")}>
            {publicado ? "✓ Publicado" : publicando ? "Publicando..." : "Publicar semana completa"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: "700px" }}>
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase w-40">Empleado</th>
              {dias.map(d => (
                <th key={d} className={"px-2 py-3 text-center text-xs font-semibold uppercase " + ([0,6].includes(new Date(d + "T12:00:00").getDay()) ? "text-zinc-600" : "text-zinc-400")}>
                  {nombreDia(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {empleados.map(emp => (
              <tr key={emp.id} className="hover:bg-zinc-900 transition">
                <td className="px-4 py-2">
                  <p className="text-sm font-semibold text-white truncate max-w-[130px]">{emp.nombre}</p>
                  <p className="text-xs text-zinc-500 truncate">{emp.cargo}</p>
                </td>
                {dias.map(fecha => {
                  const turno = getTurno(emp.id, fecha);
                  const esFinde = [0,6].includes(new Date(fecha + "T12:00:00").getDay());
                  return (
                    <td key={fecha} className={"px-1 py-2 text-center " + (esFinde ? "bg-zinc-950" : "")}>
                      {turno ? (
                        <div className="rounded-lg bg-blue-950 border border-blue-900 p-1.5 cursor-pointer group relative"
                          onClick={() => abrirModal(emp, fecha)}>
                          <p className="text-xs font-bold text-blue-300">{turno.hora_entrada_prog}</p>
                          <p className="text-xs text-blue-400">{turno.hora_salida_prog}</p>
                          <button onClick={e => { e.stopPropagation(); eliminarTurno(emp.id, fecha); }}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-xs hidden group-hover:flex items-center justify-center">×</button>
                        </div>
                      ) : (
                        <button onClick={() => !esFinde && abrirModal(emp, fecha)}
                          className={"w-full rounded-lg border border-dashed py-2 text-xs transition " + (esFinde ? "border-zinc-800 text-zinc-700 cursor-default" : "border-zinc-700 text-zinc-600 hover:border-blue-700 hover:text-blue-400 cursor-pointer")}>
                          {esFinde ? "—" : "+ Turno"}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-900 border border-blue-800" /><span className="text-xs text-zinc-500">Turno programado</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border border-dashed border-zinc-700" /><span className="text-xs text-zinc-500">Sin turno</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-zinc-950 border border-zinc-800" /><span className="text-xs text-zinc-500">Fin de semana</span></div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Asignar turno</h3>
              <button onClick={() => setModal(null)} className="text-zinc-400 hover:text-white text-xl font-bold">X</button>
            </div>
            <div className="rounded-xl bg-zinc-900 p-3 mb-4">
              <p className="text-sm font-bold text-white">{modal.empleado.nombre}</p>
              <p className="text-xs text-zinc-500">{modal.fecha}</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Entrada</label>
                  <input type="time" value={formTurno.entrada} onChange={e => setFormTurno({...formTurno, entrada: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Salida</label>
                  <input type="time" value={formTurno.salida} onChange={e => setFormTurno({...formTurno, salida: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Zona</label>
                <input value={formTurno.zona} onChange={e => setFormTurno({...formTurno, zona: e.target.value})} className={inputClass} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModal(null)} className="flex-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-2.5 text-sm font-bold text-zinc-300 transition">Cancelar</button>
                <button onClick={guardarTurno} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-bold text-white transition">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
