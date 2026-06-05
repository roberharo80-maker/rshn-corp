"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../app/lib/supabase";

type TurnoActivo = {
  id: number; empleado_nombre: string; zona_trabajo: string;
  hora_entrada_prog: string; hora_salida_prog: string;
  hora_entrada_real: string | null; estado: string;
};

export default function MiTurno({ empleadoId, empleadoNombre }: { empleadoId?: number; empleadoNombre?: string }) {
  const [turno, setTurno] = useState<TurnoActivo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [rastreando, setRastreando] = useState(false);
  const [miUbicacion, setMiUbicacion] = useState<{lat: number; lng: number} | null>(null);
  const [horaActual, setHoraActual] = useState(new Date());
  const [mensaje, setMensaje] = useState("");
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    cargar();
    const reloj = setInterval(() => setHoraActual(new Date()), 1000);
    return () => { clearInterval(reloj); if (intervaloRef.current) clearInterval(intervaloRef.current); };
  }, []);

  async function cargar() {
    if (!empleadoId) { setCargando(false); return; }
    setCargando(true);
    const hoy = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("corp_turnos").select("*").eq("empleado_id", empleadoId).eq("fecha", hoy).maybeSingle();
    setTurno(data || null);
    setCargando(false);
  }

  async function registrarEntrada() {
    if (!empleadoId) return;
    setRegistrando(true);
    const ahora = new Date().toTimeString().slice(0, 5);
    const hoy = new Date().toISOString().slice(0, 10);
    const { data: emp } = await supabase.from("corp_empleados").select("*").eq("id", empleadoId).maybeSingle();
    if (!emp) { setRegistrando(false); return; }
    const [ph, pm] = emp.hora_entrada.split(":").map(Number);
    const [rh, rm] = ahora.split(":").map(Number);
    const minutos = (rh * 60 + rm) - (ph * 60 + pm);
    const tardanza = minutos > 10;
    const { data } = await supabase.from("corp_turnos").insert([{
      empleado_id: empleadoId, empleado_nombre: empleadoNombre,
      zona_trabajo: emp.zona_trabajo, fecha: hoy,
      hora_entrada_prog: emp.hora_entrada, hora_salida_prog: emp.hora_salida,
      hora_entrada_real: ahora, tardanza, minutos_tardanza: tardanza ? minutos : 0,
      estado: "presente", en_zona: true,
    }]).select().single();
    if (data) {
      setTurno(data);
      setMensaje(tardanza ? "Entrada registrada con " + minutos + " min de retraso." : "Entrada registrada correctamente.");
      if (tardanza) {
        await supabase.from("corp_alertas").insert([{
          empleado_nombre: empleadoNombre, tipo: "Tardanza",
          descripcion: minutos + " minutos de retraso", resuelta: false,
        }]);
      }
    }
    setRegistrando(false);
    setTimeout(() => setMensaje(""), 4000);
  }

  async function registrarSalida() {
    if (!turno) return;
    setRegistrando(true);
    const ahora = new Date().toTimeString().slice(0, 5);
    await supabase.from("corp_turnos").update({ hora_salida_real: ahora, estado: "salio" }).eq("id", turno.id);
    detenerRastreo();
    setMensaje("Salida registrada. Hasta pronto.");
    await cargar();
    setRegistrando(false);
    setTimeout(() => setMensaje(""), 4000);
  }

  function iniciarRastreo() {
    if (!navigator.geolocation || !turno) return;
    setRastreando(true);
    navigator.geolocation.getCurrentPosition(pos => {
      setMiUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      enviarUbicacion(pos.coords.latitude, pos.coords.longitude);
    });
    intervaloRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(pos => {
        setMiUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        enviarUbicacion(pos.coords.latitude, pos.coords.longitude);
      });
    }, 120000);
  }

  async function enviarUbicacion(lat: number, lng: number) {
    if (!empleadoId) return;
    await supabase.from("corp_empleados_ubicacion").upsert([{
      empleado_id: empleadoId, nombre: empleadoNombre,
      ultima_latitud: lat, ultima_longitud: lng,
      ultimo_movimiento: new Date().toISOString(), en_zona: true,
    }], { onConflict: "empleado_id" });
  }

  function detenerRastreo() {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    setRastreando(false);
  }

  const horaStr = horaActual.toLocaleTimeString("es-EC");
  const fechaStr = horaActual.toLocaleDateString("es-EC", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center">
        <p className="text-4xl font-mono font-bold text-white">{horaStr}</p>
        <p className="text-xs text-zinc-500 mt-1">{fechaStr}</p>
      </div>

      {mensaje && (
        <div className="rounded-xl border border-green-800 bg-green-950/20 p-4 text-center">
          <p className="text-sm font-bold text-green-400">{mensaje}</p>
        </div>
      )}

      {cargando ? <p className="text-zinc-500 text-sm text-center">Cargando turno...</p> : (
        <>
          {!turno ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center space-y-4">
              <p className="text-zinc-400 text-sm">No has registrado entrada hoy.</p>
              <button onClick={registrarEntrada} disabled={registrando}
                className="w-full rounded-xl bg-green-700 hover:bg-green-600 py-4 text-sm font-bold text-white transition disabled:opacity-50">
                {registrando ? "Registrando..." : "✓ Registrar mi entrada"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={"rounded-2xl border p-5 " + (turno.estado === "presente" ? "border-green-800 bg-green-950/20" : "border-zinc-800 bg-zinc-950")}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-white">Estado del turno</p>
                  <span className={"text-xs font-bold px-3 py-1 rounded-xl " + (turno.estado === "presente" ? "bg-green-950 text-green-400" : "bg-zinc-800 text-zinc-400")}>
                    {turno.estado === "presente" ? "● Presente" : "Salio"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-500">Zona</p>
                    <p className="text-sm font-bold text-white mt-1">{turno.zona_trabajo}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-500">Horario</p>
                    <p className="text-sm font-bold text-white mt-1">{turno.hora_entrada_prog} — {turno.hora_salida_prog}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-500">Entrada real</p>
                    <p className="text-sm font-bold text-white mt-1">{turno.hora_entrada_real || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-500">GPS</p>
                    <p className={"text-sm font-bold mt-1 " + (rastreando ? "text-green-400" : "text-zinc-500")}>{rastreando ? "Activo" : "Inactivo"}</p>
                  </div>
                </div>
              </div>

              {turno.estado === "presente" && (
                <div className="space-y-2">
                  <button onClick={rastreando ? detenerRastreo : iniciarRastreo}
                    className={"w-full rounded-xl py-3 text-sm font-bold transition " + (rastreando ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300" : "bg-blue-700 hover:bg-blue-600 text-white")}>
                    {rastreando ? "Detener rastreo GPS" : "Activar rastreo GPS"}
                  </button>
                  <button onClick={registrarSalida} disabled={registrando}
                    className="w-full rounded-xl bg-red-800 hover:bg-red-700 py-3 text-sm font-bold text-white transition disabled:opacity-50">
                    {registrando ? "Registrando..." : "Registrar mi salida"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
