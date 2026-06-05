"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../app/lib/supabase";

type EmpleadoUbicacion = {
  id: number; nombre: string; zona_trabajo: string;
  ultima_latitud: number | null; ultima_longitud: number | null;
  ultimo_movimiento: string | null; en_zona: boolean;
};

function minutosDesde(fecha: string | null): number {
  if (!fecha) return 999;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
}

export default function RastreoGPSCorp({ empleadoId, empleadoNombre }: { empleadoId?: number; empleadoNombre?: string }) {
  const [empleados, setEmpleados] = useState<EmpleadoUbicacion[]>([]);
  const [rastreando, setRastreando] = useState(false);
  const [miUbicacion, setMiUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    cargar();
    const recarga = setInterval(cargar, 30000);
    return () => { clearInterval(recarga); if (intervaloRef.current) clearInterval(intervaloRef.current); };
  }, []);

  async function cargar() {
    const { data } = await supabase.from("corp_empleados_ubicacion").select("*").order("nombre");
    if (data) setEmpleados(data);
  }

  async function enviarUbicacion(lat: number, lng: number) {
    if (!empleadoId) return;
    const { data: emp } = await supabase.from("corp_empleados").select("zona_lat,zona_lng,zona_radio,zona_trabajo").eq("id", empleadoId).maybeSingle();
    let enZona = true;
    if (emp?.zona_lat && emp?.zona_lng) {
      const R = 6371000;
      const dLat = (lat - emp.zona_lat) * Math.PI / 180;
      const dLng = (lng - emp.zona_lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(emp.zona_lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      enZona = dist <= (emp.zona_radio || 200);
      if (!enZona) {
        await fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mensaje: "🚨 *EMPLEADO FUERA DE ZONA - RSHN CORP*\n\nEmpleado: *" + empleadoNombre + "*\nZona asignada: " + emp.zona_trabajo + "\nUbicacion actual: https://maps.google.com/?q=" + lat + "," + lng + "\n\n_Verifique inmediatamente_",
            grupo: true,
          }),
        }).catch(() => {});
      }
    }
    await supabase.from("corp_empleados_ubicacion").upsert([{
      empleado_id: empleadoId, nombre: empleadoNombre || "Empleado",
      ultima_latitud: lat, ultima_longitud: lng,
      ultimo_movimiento: new Date().toISOString(), en_zona: enZona,
    }], { onConflict: "empleado_id" });
    setMiUbicacion({ lat, lng });
  }

  function iniciarRastreo() {
    if (!navigator.geolocation) { setError("GPS no disponible."); return; }
    setRastreando(true); setError("");
    navigator.geolocation.getCurrentPosition(pos => enviarUbicacion(pos.coords.latitude, pos.coords.longitude), () => {});
    intervaloRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(pos => enviarUbicacion(pos.coords.latitude, pos.coords.longitude), () => {});
    }, 120000);
  }

  function detenerRastreo() {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    setRastreando(false); setMiUbicacion(null);
  }

  const enLinea = empleados.filter(e => minutosDesde(e.ultimo_movimiento) < 10 && e.ultima_latitud);
  const fueraZona = empleados.filter(e => !e.en_zona && e.ultima_latitud);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Rastreo GPS</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Ubicacion en tiempo real del personal en campo</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "En linea", value: enLinea.length, color: "text-green-400" },
          { label: "Fuera de zona", value: fueraZona.length, color: "text-red-400" },
          { label: "Sin GPS", value: empleados.filter(e => !e.ultima_latitud || minutosDesde(e.ultimo_movimiento) >= 10).length, color: "text-zinc-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase">{s.label}</p>
            <p className={"text-3xl font-bold mt-1 " + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      {empleadoId && (
        <div className={"rounded-2xl border p-4 " + (rastreando ? "border-green-700 bg-green-950/20" : "border-zinc-800 bg-zinc-950")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">{rastreando ? "Rastreo activo" : "Rastreo inactivo"}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{miUbicacion ? miUbicacion.lat.toFixed(5) + ", " + miUbicacion.lng.toFixed(5) : "Sin ubicacion"}</p>
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            </div>
            <button onClick={rastreando ? detenerRastreo : iniciarRastreo}
              className={"px-4 py-2 rounded-xl text-sm font-bold transition " + (rastreando ? "bg-red-700 hover:bg-red-600 text-white" : "bg-green-700 hover:bg-green-600 text-white")}>
              {rastreando ? "Detener" : "Activar GPS"}
            </button>
          </div>
        </div>
      )}

      {empleados.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-500 text-sm">Sin empleados con GPS activo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {empleados.map(e => {
            const mins = minutosDesde(e.ultimo_movimiento);
            const activo = mins < 10;
            return (
              <div key={e.id} className={"rounded-2xl border p-4 " + (!e.en_zona ? "border-red-900 bg-red-950/10" : "border-zinc-800 bg-zinc-950")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-zinc-300">{e.nombre.charAt(0)}</div>
                      <div className={"absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-950 " + (activo ? "bg-green-400" : "bg-zinc-600")} />
                    </div>
                    <div>
                      <p className="font-bold text-white">{e.nombre}</p>
                      <p className="text-xs text-zinc-500">{e.zona_trabajo} · {activo ? "Hace " + mins + " min" : "Sin senal"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!e.en_zona && <span className="text-xs text-red-400 font-bold">⚠ Fuera de zona</span>}
                    {e.ultima_latitud && (
                      <button onClick={() => window.open("https://maps.google.com/?q=" + e.ultima_latitud + "," + e.ultima_longitud, "_blank")}
                        className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-xs font-bold text-blue-300 transition">
                        Ver en mapa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
