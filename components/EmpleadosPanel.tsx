"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

type Empleado = {
  id: number; codigo: string; nombre: string; cedula: string; cargo: string;
  empresa: string; zona_trabajo: string; telefono: string; estado: string;
  hora_entrada: string; hora_salida: string; zona_lat?: number; zona_lng?: number; zona_radio?: number;
  created_at: string;
};

const CARGOS = ["Obrero","Tecnico","Supervisor de campo","Vendedor","Repartidor","Enfermero domiciliario","Inspector","Conductor","Mensajero","Limpieza","Otro"];
const ZONAS = ["Zona Norte","Zona Sur","Zona Centro","Zona Este","Zona Oeste","Planta 1","Planta 2","Oficina Central","Campo","Ruta 1","Ruta 2"];

export default function EmpleadosPanel() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [perfil, setPerfil] = useState<Empleado | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: "", cedula: "", cargo: "Obrero", empresa: "", zona_trabajo: "Zona Norte",
    telefono: "", hora_entrada: "08:00", hora_salida: "17:00", zona_radio: 200,
  });

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("corp_empleados").select("*").order("nombre");
    if (data) setEmpleados(data);
    setCargando(false);
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.cedula.trim()) { alert("Nombre y cedula son obligatorios."); return; }
    setGuardando(true);
    const codigo = "EMP-" + Date.now().toString().slice(-6);
    await supabase.from("corp_empleados").insert([{ ...form, codigo, estado: "Activo" }]);
    setGuardando(false);
    setMostrarForm(false);
    setForm({ nombre: "", cedula: "", cargo: "Obrero", empresa: "", zona_trabajo: "Zona Norte", telefono: "", hora_entrada: "08:00", hora_salida: "17:00", zona_radio: 200 });
    await cargar();
  }

  const filtrados = empleados.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.cedula.includes(busqueda) ||
    e.cargo.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.zona_trabajo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2.5 text-white text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1";

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Mis Empleados</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{empleados.length} empleados registrados</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition">+ Nuevo Empleado</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Activos", value: empleados.filter(e => e.estado === "Activo").length, color: "text-green-400" },
          { label: "Inactivos", value: empleados.filter(e => e.estado === "Inactivo").length, color: "text-red-400" },
          { label: "Zonas", value: [...new Set(empleados.map(e => e.zona_trabajo))].length, color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase">{s.label}</p>
            <p className={"text-3xl font-bold mt-1 " + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, cedula, cargo o zona..."
        className="w-full mb-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />

      {cargando ? <p className="text-zinc-500 text-sm">Cargando...</p> :
      filtrados.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-500">No hay empleados registrados.</p>
          <button onClick={() => setMostrarForm(true)} className="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition">Registrar primer empleado</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(e => (
            <div key={e.id} onClick={() => setPerfil(e)} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-600 transition cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-lg font-black text-blue-300">{e.nombre.charAt(0)}</div>
                  <div>
                    <p className="font-bold text-white group-hover:text-blue-400 transition">{e.nombre}</p>
                    <p className="text-xs text-zinc-500">{e.cargo} · {e.zona_trabajo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">{e.hora_entrada} — {e.hora_salida}</p>
                    <p className="text-xs text-zinc-600">{e.empresa || "Sin empresa"}</p>
                  </div>
                  <span className={"text-xs font-bold px-2 py-1 rounded-lg " + (e.estado === "Activo" ? "bg-green-950 text-green-400" : "bg-zinc-800 text-zinc-500")}>{e.estado}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-6 max-w-lg w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Nuevo Empleado</h2>
              <button onClick={() => setMostrarForm(false)} className="text-zinc-400 hover:text-white text-xl font-bold">X</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Nombre completo *</label><input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className={inputClass} spellCheck /></div>
                <div><label className={labelClass}>Cedula *</label><input value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Cargo</label><select value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} className={inputClass}>{CARGOS.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className={labelClass}>Empresa / Cliente</label><input value={form.empresa} onChange={e => setForm({...form, empresa: e.target.value})} className={inputClass} spellCheck /></div>
              </div>
              <div><label className={labelClass}>Zona de trabajo</label><select value={form.zona_trabajo} onChange={e => setForm({...form, zona_trabajo: e.target.value})} className={inputClass}>{ZONAS.map(z => <option key={z}>{z}</option>)}</select></div>
              <div><label className={labelClass}>Telefono</label><input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Hora entrada</label><input type="time" value={form.hora_entrada} onChange={e => setForm({...form, hora_entrada: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Hora salida</label><input type="time" value={form.hora_salida} onChange={e => setForm({...form, hora_salida: e.target.value})} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Radio de geocerca (metros)</label><input type="number" value={form.zona_radio} onChange={e => setForm({...form, zona_radio: parseInt(e.target.value)})} className={inputClass} /></div>
              <div className="flex gap-3">
                <button onClick={() => setMostrarForm(false)} className="flex-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-3 text-sm font-bold text-zinc-300 transition">Cancelar</button>
                <button onClick={guardar} disabled={guardando} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-bold text-white transition disabled:opacity-50">{guardando ? "Guardando..." : "Registrar empleado"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {perfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-6 max-w-lg w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Perfil del Empleado</h2>
              <button onClick={() => setPerfil(null)} className="text-zinc-400 hover:text-white text-xl font-bold">X</button>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-900 flex items-center justify-center text-3xl font-black text-blue-300">{perfil.nombre.charAt(0)}</div>
              <div>
                <p className="text-xl font-bold text-white">{perfil.nombre}</p>
                <p className="text-sm text-zinc-400">{perfil.cargo} · {perfil.empresa || "Sin empresa"}</p>
                <span className={"text-xs font-bold px-2 py-0.5 rounded-lg " + (perfil.estado === "Activo" ? "bg-green-950 text-green-400" : "bg-zinc-800 text-zinc-500")}>{perfil.estado}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Codigo", value: perfil.codigo },
                { label: "Cedula", value: perfil.cedula },
                { label: "Zona de trabajo", value: perfil.zona_trabajo },
                { label: "Telefono", value: perfil.telefono || "No registrado" },
                { label: "Horario", value: perfil.hora_entrada + " — " + perfil.hora_salida },
                { label: "Radio geocerca", value: (perfil.zona_radio || 200) + " metros" },
              ].map(f => (
                <div key={f.label} className="rounded-xl bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">{f.label}</p>
                  <p className="text-sm font-semibold text-white mt-1">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
