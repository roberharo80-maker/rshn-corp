"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../app/lib/supabase";

type Empleado = { id: number; nombre: string; cargo: string; cedula: string; zona_trabajo: string; hora_entrada: string; hora_salida: string; };

export default function FichajeBiometrico() {
  const [cedula, setCedula] = useState("");
  const [fase, setFase] = useState<"espera"|"verificando"|"exito"|"error"|"yaregistrado">("espera");
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [accion, setAccion] = useState<"entrada"|"salida">("entrada");
  const [turnoActual, setTurnoActual] = useState<any>(null);
  const [hora, setHora] = useState(new Date());
  const [historial, setHistorial] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const reloj = setInterval(() => setHora(new Date()), 1000);
    cargarHistorial();
    inputRef.current?.focus();
    return () => clearInterval(reloj);
  }, []);

  async function cargarHistorial() {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("corp_turnos").select("*").eq("fecha", hoy).order("created_at", { ascending: false }).limit(10);
    if (data) setHistorial(data);
  }

  async function verificar() {
    if (!cedula.trim()) return;
    setFase("verificando");
    const { data: emp } = await supabase.from("corp_empleados").select("*").eq("cedula", cedula.trim()).eq("estado", "Activo").maybeSingle();
    if (!emp) { setFase("error"); setTimeout(() => { setFase("espera"); setCedula(""); inputRef.current?.focus(); }, 3000); return; }
    setEmpleado(emp);
    const hoy = new Date().toISOString().slice(0, 10);
    const { data: turno } = await supabase.from("corp_turnos").select("*").eq("empleado_id", emp.id).eq("fecha", hoy).maybeSingle();
    setTurnoActual(turno);
    if (turno?.hora_entrada_real && turno?.hora_salida_real) {
      setFase("yaregistrado"); setTimeout(() => { setFase("espera"); setCedula(""); setEmpleado(null); inputRef.current?.focus(); }, 4000); return;
    }
    setAccion(!turno?.hora_entrada_real ? "entrada" : "salida");
    await registrar(emp, turno);
  }

  async function registrar(emp: Empleado, turno: any) {
    const ahora = new Date().toTimeString().slice(0, 5);
    const hoy = new Date().toISOString().slice(0, 10);
    if (!turno?.hora_entrada_real) {
      const [ph, pm] = (emp.hora_entrada || "08:00").split(":").map(Number);
      const [rh, rm] = ahora.split(":").map(Number);
      const minutos = (rh * 60 + rm) - (ph * 60 + pm);
      const tardanza = minutos > 10;
      if (turno) {
        await supabase.from("corp_turnos").update({ hora_entrada_real: ahora, estado: "presente", tardanza, minutos_tardanza: tardanza ? minutos : 0 }).eq("id", turno.id);
      } else {
        await supabase.from("corp_turnos").insert([{
          empleado_id: emp.id, empleado_nombre: emp.nombre, zona_trabajo: emp.zona_trabajo,
          fecha: hoy, hora_entrada_prog: emp.hora_entrada, hora_salida_prog: emp.hora_salida,
          hora_entrada_real: ahora, tardanza, minutos_tardanza: tardanza ? minutos : 0, estado: "presente",
        }]);
      }
      if (tardanza) {
        await supabase.from("corp_alertas").insert([{ empleado_nombre: emp.nombre, tipo: "Tardanza", descripcion: minutos + " minutos de retraso", resuelta: false }]);
      }
      setAccion("entrada");
    } else {
      await supabase.from("corp_turnos").update({ hora_salida_real: ahora, estado: "salio" }).eq("id", turno.id);
      setAccion("salida");
    }
    if ("vibrate" in navigator) navigator.vibrate(200);
    setFase("exito");
    await cargarHistorial();
    setTimeout(() => { setFase("espera"); setCedula(""); setEmpleado(null); inputRef.current?.focus(); }, 3500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Fichaje Digital</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Registro de entrada y salida por cedula</p>
        </div>
        <div className="text-right bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3">
          <p className="text-2xl font-mono font-bold text-white">{hora.toLocaleTimeString("es-EC")}</p>
          <p className="text-xs text-zinc-500 mt-0.5 capitalize">{hora.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>

      <div className={"rounded-2xl border p-8 text-center transition-all " +
        (fase === "exito" ? "border-green-700 bg-green-950/20" :
         fase === "error" ? "border-red-700 bg-red-950/20" :
         fase === "yaregistrado" ? "border-yellow-700 bg-yellow-950/20" :
         fase === "verificando" ? "border-blue-700 bg-blue-950/20" :
         "border-zinc-800 bg-zinc-950")}>

        {fase === "espera" && (
          <>
            <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="1.5">
                <path d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
              </svg>
            </div>
            <p className="text-white font-bold text-lg mb-2">Ingrese su cedula</p>
            <p className="text-zinc-500 text-sm mb-6">Digite su numero de cedula para registrar entrada o salida</p>
            <div className="flex gap-3 max-w-xs mx-auto">
              <input ref={inputRef} value={cedula} onChange={e => setCedula(e.target.value)}
                onKeyDown={e => e.key === "Enter" && verificar()}
                placeholder="0000000000" maxLength={13}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:border-blue-500" />
              <button onClick={verificar} className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-3 text-white font-bold transition">✓</button>
            </div>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mt-4">
              {[1,2,3,4,5,6,7,8,9,"C",0,"↵"].map(k => (
                <button key={k} onClick={() => {
                  if (k === "C") setCedula("");
                  else if (k === "↵") verificar();
                  else setCedula(prev => (prev + k).slice(0, 13));
                }} className={"rounded-xl py-3 text-sm font-bold transition " + (k === "↵" ? "bg-blue-600 hover:bg-blue-500 text-white" : k === "C" ? "bg-red-900 hover:bg-red-800 text-red-300" : "bg-zinc-800 hover:bg-zinc-700 text-white")}>
                  {k}
                </button>
              ))}
            </div>
          </>
        )}

        {fase === "verificando" && (
          <div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-bold text-lg">Verificando...</p>
            <p className="text-zinc-500 text-sm mt-1">Cedula: {cedula}</p>
          </div>
        )}

        {fase === "exito" && empleado && (
          <div>
            <div className="w-20 h-20 rounded-full bg-green-700 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <p className="text-3xl font-black text-white mb-1">{empleado.nombre}</p>
            <p className="text-zinc-400 text-sm mb-3">{empleado.cargo} · {empleado.zona_trabajo}</p>
            <div className={"inline-block px-6 py-2 rounded-xl font-black text-lg " + (accion === "entrada" ? "bg-green-700 text-white" : "bg-blue-700 text-white")}>
              {accion === "entrada" ? "✓ ENTRADA REGISTRADA" : "✓ SALIDA REGISTRADA"}
            </div>
            <p className="text-2xl font-mono font-bold text-white mt-3">{new Date().toLocaleTimeString("es-EC")}</p>
          </div>
        )}

        {fase === "error" && (
          <div>
            <div className="w-20 h-20 rounded-full bg-red-700 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
            <p className="text-red-400 font-black text-xl">EMPLEADO NO ENCONTRADO</p>
            <p className="text-zinc-500 text-sm mt-2">Cedula: {cedula}</p>
            <p className="text-zinc-600 text-xs mt-1">Verifique la cedula o contacte al supervisor</p>
          </div>
        )}

        {fase === "yaregistrado" && empleado && (
          <div>
            <div className="w-20 h-20 rounded-full bg-yellow-700 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            </div>
            <p className="text-yellow-400 font-black text-xl">{empleado.nombre}</p>
            <p className="text-zinc-400 text-sm mt-2">Ya tiene entrada y salida registradas hoy.</p>
          </div>
        )}
      </div>

      {historial.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-white mb-4">Ultimos fichajes del dia</p>
          <div className="space-y-2">
            {historial.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">{t.empleado_nombre.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.empleado_nombre}</p>
                    <p className="text-xs text-zinc-500">{t.zona_trabajo}</p>
                  </div>
                </div>
                <div className="text-right">
                  {t.hora_entrada_real && <p className="text-xs text-green-400 font-bold">↓ {t.hora_entrada_real}</p>}
                  {t.hora_salida_real && <p className="text-xs text-blue-400 font-bold">↑ {t.hora_salida_real}</p>}
                  {t.tardanza && <p className="text-xs text-yellow-400">+{t.minutos_tardanza}min</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
