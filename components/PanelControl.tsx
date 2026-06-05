"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

export default function PanelControl({ onNavigate }: { onNavigate?: (s: string) => void }) {
  const [kpis, setKpis] = useState({ presentes: 0, ausentes: 0, tardanzas: 0, enZona: 0, fueraZona: 0, horasTrabajadas: 0 });
  const [alertas, setAlertas] = useState<any[]>([]);
  const [turnosHoy, setTurnosHoy] = useState<any[]>([]);
  const [hora, setHora] = useState(new Date());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
    const reloj = setInterval(() => setHora(new Date()), 1000);
    const recarga = setInterval(cargar, 30000);
    return () => { clearInterval(reloj); clearInterval(recarga); };
  }, []);

  async function cargar() {
    setCargando(true);
    const hoy = new Date().toISOString().slice(0, 10);
    const [{ data: turnos }, { data: alertasData }, { data: ubicaciones }] = await Promise.all([
      supabase.from("corp_turnos").select("*").eq("fecha", hoy),
      supabase.from("corp_alertas").select("*").eq("resuelta", false).order("created_at", { ascending: false }).limit(5),
      supabase.from("corp_empleados_ubicacion").select("*"),
    ]);
    if (turnos) {
      let horas = 0;
      turnos.forEach(t => {
        if (t.hora_entrada_real && t.hora_salida_real) {
          const [eh, em] = t.hora_entrada_real.split(":").map(Number);
          const [sh, sm] = t.hora_salida_real.split(":").map(Number);
          horas += (sh * 60 + sm - eh * 60 - em) / 60;
        } else if (t.hora_entrada_real) {
          const [eh, em] = t.hora_entrada_real.split(":").map(Number);
          const ahora = new Date();
          horas += (ahora.getHours() * 60 + ahora.getMinutes() - eh * 60 - em) / 60;
        }
      });
      setKpis({
        presentes: turnos.filter(t => t.estado === "presente").length,
        ausentes: turnos.filter(t => t.estado === "ausente").length,
        tardanzas: turnos.filter(t => t.tardanza).length,
        enZona: ubicaciones?.filter(u => u.en_zona).length || 0,
        fueraZona: ubicaciones?.filter(u => !u.en_zona).length || 0,
        horasTrabajadas: Math.round(horas * 10) / 10,
      });
      setTurnosHoy(turnos.slice(0, 5));
    }
    if (alertasData) setAlertas(alertasData);
    setCargando(false);
  }

  async function resolverAlerta(id: number) {
    await supabase.from("corp_alertas").update({ resuelta: true }).eq("id", id);
    await cargar();
  }

  const stats = [
    { label: "Presentes", value: kpis.presentes, sub: "En horario activo", color: "text-green-400", border: "hover:border-green-800", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", seccion: "Control de Turnos" },
    { label: "Ausentes", value: kpis.ausentes, sub: "Sin registrar entrada", color: "text-red-400", border: "hover:border-red-800", icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z", seccion: "Puntualidad" },
    { label: "Tardanzas", value: kpis.tardanzas, sub: "Llegaron tarde hoy", color: "text-yellow-400", border: "hover:border-yellow-800", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", seccion: "Puntualidad" },
    { label: "Horas trabajadas", value: kpis.horasTrabajadas + "h", sub: "Acumuladas hoy", color: "text-blue-400", border: "hover:border-blue-800", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", seccion: "Reportes" },
    { label: "En zona GPS", value: kpis.enZona, sub: "Dentro del area asignada", color: "text-cyan-400", border: "hover:border-cyan-800", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", seccion: "Rastreo GPS" },
    { label: "Fuera de zona", value: kpis.fueraZona, sub: "Requieren verificacion", color: kpis.fueraZona > 0 ? "text-red-400" : "text-green-400", border: "hover:border-red-800", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", seccion: "Rastreo GPS" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Panel de Control</h1>
          <p className="text-zinc-400 text-sm mt-1">Vision en tiempo real de tu fuerza laboral</p>
        </div>
        <div className="text-right bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3">
          <p className="text-2xl font-mono font-bold text-white">{hora.toLocaleTimeString("es-EC")}</p>
          <p className="text-xs text-zinc-500 mt-0.5 capitalize">{hora.toLocaleDateString("es-EC", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="rounded-2xl border border-red-900 bg-red-950/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-red-400">⚠ {alertas.length} alerta{alertas.length > 1 ? "s" : ""} activa{alertas.length > 1 ? "s" : ""}</p>
          </div>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div key={i} className="rounded-xl bg-red-950/20 border border-red-900 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{a.empleado_nombre}</p>
                  <p className="text-xs text-zinc-400">{a.tipo} — {a.descripcion}</p>
                </div>
                <button onClick={() => resolverAlerta(a.id)} className="text-xs px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition">Resolver</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <button key={s.label} onClick={() => onNavigate && onNavigate(s.seccion)}
            className={"rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition group w-full " + s.border}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</p>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className={"flex-shrink-0 " + s.color}>
                <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
              </svg>
            </div>
            <p className={"text-4xl font-bold " + s.color}>{cargando ? "—" : s.value}</p>
            <p className="text-xs text-zinc-600 group-hover:text-zinc-400 transition mt-2">{s.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-white mb-4">Actividad reciente de hoy</p>
          {turnosHoy.length === 0 ? (
            <p className="text-zinc-500 text-sm">Sin registros hoy.</p>
          ) : (
            <div className="space-y-3">
              {turnosHoy.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">{t.empleado_nombre.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.empleado_nombre}</p>
                      <p className="text-xs text-zinc-500">{t.zona_trabajo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">{t.hora_entrada_real || "Sin entrada"}</p>
                    {t.tardanza && <p className="text-xs text-yellow-400">+{t.minutos_tardanza}min</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-white mb-4">Acciones rapidas</p>
          <div className="space-y-2">
            {[
              { label: "+ Registrar nuevo empleado", seccion: "Mis Empleados", color: "bg-blue-700 hover:bg-blue-600" },
              { label: "Ver rastreo GPS en vivo", seccion: "Rastreo GPS", color: "bg-zinc-800 hover:bg-zinc-700" },
              { label: "Revisar puntualidad del mes", seccion: "Puntualidad", color: "bg-zinc-800 hover:bg-zinc-700" },
              { label: "Ver reporte de productividad", seccion: "Productividad", color: "bg-zinc-800 hover:bg-zinc-700" },
              { label: "Exportar reporte del periodo", seccion: "Reportes", color: "bg-zinc-800 hover:bg-zinc-700" },
            ].map(a => (
              <button key={a.label} onClick={() => onNavigate && onNavigate(a.seccion)}
                className={"w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition text-left " + a.color}>
                {a.label} →
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
