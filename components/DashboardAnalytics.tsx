"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

type DatoSemana = { dia: string; presentes: number; ausentes: number; tardanzas: number; horas: number; };

export default function DashboardAnalytics({ onNavigate }: { onNavigate?: (s: string) => void }) {
  const [datos, setDatos] = useState<DatoSemana[]>([]);
  const [kpisGlobales, setKpisGlobales] = useState({ tasaAsistencia: 0, tasaPuntualidad: 0, horasSemanales: 0, empleadosActivos: 0 });
  const [topEmpleados, setTopEmpleados] = useState<any[]>([]);
  const [zonasStats, setZonasStats] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const hace7 = new Date(); hace7.setDate(hace7.getDate() - 6);
    const { data: turnos } = await supabase.from("corp_turnos").select("*").gte("fecha", hace7.toISOString().slice(0, 10));
    const { data: empleados } = await supabase.from("corp_empleados").select("*").eq("estado", "Activo");

    if (turnos && empleados) {
      const diasMap: Record<string, DatoSemana> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        diasMap[key] = { dia: d.toLocaleDateString("es-EC", { weekday: "short" }), presentes: 0, ausentes: 0, tardanzas: 0, horas: 0 };
      }
      turnos.forEach(t => {
        if (!diasMap[t.fecha]) return;
        if (t.estado === "presente" || t.estado === "salio") diasMap[t.fecha].presentes++;
        else diasMap[t.fecha].ausentes++;
        if (t.tardanza) diasMap[t.fecha].tardanzas++;
        if (t.hora_entrada_real && t.hora_salida_real) {
          const [eh, em] = t.hora_entrada_real.split(":").map(Number);
          const [sh, sm] = t.hora_salida_real.split(":").map(Number);
          diasMap[t.fecha].horas += (sh * 60 + sm - eh * 60 - em) / 60;
        }
      });
      setDatos(Object.values(diasMap));

      const total = turnos.length;
      const presentes = turnos.filter(t => t.estado !== "ausente").length;
      const puntuales = turnos.filter(t => t.estado !== "ausente" && !t.tardanza).length;
      const horasTotal = turnos.reduce((a, t) => {
        if (t.hora_entrada_real && t.hora_salida_real) {
          const [eh, em] = t.hora_entrada_real.split(":").map(Number);
          const [sh, sm] = t.hora_salida_real.split(":").map(Number);
          return a + (sh * 60 + sm - eh * 60 - em) / 60;
        }
        return a;
      }, 0);

      setKpisGlobales({
        tasaAsistencia: total > 0 ? Math.round((presentes / total) * 100) : 0,
        tasaPuntualidad: presentes > 0 ? Math.round((puntuales / presentes) * 100) : 0,
        horasSemanales: Math.round(horasTotal * 10) / 10,
        empleadosActivos: empleados.length,
      });

      const empStats: Record<string, any> = {};
      turnos.forEach(t => {
        if (!empStats[t.empleado_nombre]) empStats[t.empleado_nombre] = { nombre: t.empleado_nombre, presentes: 0, total: 0, tardanzas: 0 };
        empStats[t.empleado_nombre].total++;
        if (t.estado !== "ausente") empStats[t.empleado_nombre].presentes++;
        if (t.tardanza) empStats[t.empleado_nombre].tardanzas++;
      });
      const ranking = Object.values(empStats).map((e: any) => ({
        ...e, tasa: Math.round((e.presentes / e.total) * 100),
      })).sort((a: any, b: any) => b.tasa - a.tasa).slice(0, 5);
      setTopEmpleados(ranking);

      const zonas: Record<string, any> = {};
      turnos.forEach(t => {
        if (!t.zona_trabajo) return;
        if (!zonas[t.zona_trabajo]) zonas[t.zona_trabajo] = { zona: t.zona_trabajo, total: 0, presentes: 0 };
        zonas[t.zona_trabajo].total++;
        if (t.estado !== "ausente") zonas[t.zona_trabajo].presentes++;
      });
      setZonasStats(Object.values(zonas).sort((a: any, b: any) => b.presentes - a.presentes));
    }
    setCargando(false);
  }

  const maxPresentes = Math.max(...datos.map(d => d.presentes), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Analitica de Fuerza Laboral</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Ultimos 7 dias · Actualizado en tiempo real</p>
        </div>
        <button onClick={cargar} className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition">↻ Actualizar</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tasa de asistencia", value: kpisGlobales.tasaAsistencia + "%", sub: "Promedio 7 dias", color: kpisGlobales.tasaAsistencia >= 90 ? "text-green-400" : kpisGlobales.tasaAsistencia >= 70 ? "text-yellow-400" : "text-red-400" },
          { label: "Tasa de puntualidad", value: kpisGlobales.tasaPuntualidad + "%", sub: "Llegadas a tiempo", color: kpisGlobales.tasaPuntualidad >= 90 ? "text-green-400" : "text-yellow-400" },
          { label: "Horas trabajadas", value: kpisGlobales.horasSemanales + "h", sub: "Esta semana", color: "text-blue-400" },
          { label: "Empleados activos", value: kpisGlobales.empleadosActivos, sub: "En el sistema", color: "text-white" },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{k.label}</p>
            <p className={"text-4xl font-bold " + k.color}>{cargando ? "—" : k.value}</p>
            <p className="text-xs text-zinc-600 mt-2">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-sm font-bold text-white mb-5">Asistencia diaria — ultimos 7 dias</p>
        <div className="flex items-end gap-2 h-32">
          {datos.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <p className="text-xs font-bold text-zinc-400">{d.presentes}</p>
              <div className="w-full rounded-t-lg bg-blue-600 transition-all" style={{ height: Math.max((d.presentes / maxPresentes) * 100, 4) + "%" }} />
              {d.tardanzas > 0 && (
                <div className="w-full rounded-t-sm bg-yellow-600" style={{ height: (d.tardanzas / maxPresentes) * 20 + "%" }} />
              )}
              <p className="text-xs text-zinc-600 capitalize">{d.dia}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-600" /><span className="text-xs text-zinc-500">Presentes</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-600" /><span className="text-xs text-zinc-500">Tardanzas</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-white mb-4">Top 5 empleados mas puntuales</p>
          {cargando ? <p className="text-zinc-500 text-sm">Cargando...</p> :
          topEmpleados.length === 0 ? <p className="text-zinc-500 text-sm">Sin datos.</p> : (
            <div className="space-y-3">
              {topEmpleados.map((e, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-600 w-5">{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">{e.nombre.charAt(0)}</div>
                    <p className="text-sm text-white">{e.nombre}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.tasa === 100 && <span className="text-xs">🏆</span>}
                    <span className={"text-sm font-bold " + (e.tasa >= 90 ? "text-green-400" : e.tasa >= 70 ? "text-yellow-400" : "text-red-400")}>{e.tasa}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-white mb-4">Asistencia por zona de trabajo</p>
          {cargando ? <p className="text-zinc-500 text-sm">Cargando...</p> :
          zonasStats.length === 0 ? <p className="text-zinc-500 text-sm">Sin datos.</p> : (
            <div className="space-y-3">
              {zonasStats.map((z, i) => {
                const tasa = z.total > 0 ? Math.round((z.presentes / z.total) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-white truncate">{z.zona}</p>
                      <p className={"text-sm font-bold " + (tasa >= 90 ? "text-green-400" : tasa >= 70 ? "text-yellow-400" : "text-red-400")}>{tasa}%</p>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={"h-full rounded-full " + (tasa >= 90 ? "bg-green-500" : tasa >= 70 ? "bg-yellow-400" : "bg-red-500")} style={{ width: tasa + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
