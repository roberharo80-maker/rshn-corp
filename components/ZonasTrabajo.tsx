"use client";
import { useEffect, useState } from "react";
import { supabase } from "../app/lib/supabase";

type Zona = {
  id: number; nombre: string; descripcion: string; lat: number; lng: number;
  radio: number; tipo: string; activa: boolean; empleados_asignados: number;
};

const TIPOS = ["Obra","Planta","Ruta","Oficina","Campo","Bodega","Cliente","Otro"];

export default function ZonasTrabajo() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "", lat: "", lng: "", radio: 200, tipo: "Obra", activa: true });

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("corp_zonas").select("*").order("nombre");
    if (data) setZonas(data);
    setCargando(false);
  }

  async function guardar() {
    if (!form.nombre.trim()) { alert("El nombre es obligatorio."); return; }
    setGuardando(true);
    await supabase.from("corp_zonas").insert([{
      nombre: form.nombre, descripcion: form.descripcion,
      lat: parseFloat(form.lat) || 0, lng: parseFloat(form.lng) || 0,
      radio: form.radio, tipo: form.tipo, activa: true, empleados_asignados: 0,
    }]);
    setGuardando(false);
    setMostrarForm(false);
    setForm({ nombre: "", descripcion: "", lat: "", lng: "", radio: 200, tipo: "Obra", activa: true });
    await cargar();
  }

  function obtenerUbicacion() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(prev => ({ ...prev, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
    });
  }

  const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2.5 text-white text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1";

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Zonas de Trabajo</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Define las areas donde opera tu personal</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition">+ Nueva Zona</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Zonas activas", value: zonas.filter(z => z.activa).length, color: "text-green-400" },
          { label: "Total zonas", value: zonas.length, color: "text-white" },
          { label: "Tipos diferentes", value: [...new Set(zonas.map(z => z.tipo))].length, color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase">{s.label}</p>
            <p className={"text-3xl font-bold mt-1 " + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      {cargando ? <p className="text-zinc-500 text-sm">Cargando...</p> :
      zonas.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-500 text-sm">No hay zonas registradas.</p>
          <button onClick={() => setMostrarForm(true)} className="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition">Crear primera zona</button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {zonas.map(z => (
            <div key={z.id} className={"rounded-2xl border p-4 " + (z.activa ? "border-zinc-800 bg-zinc-950" : "border-zinc-800 bg-zinc-950 opacity-50")}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-white">{z.nombre}</p>
                  <p className="text-xs text-zinc-500">{z.tipo} · Radio: {z.radio}m</p>
                </div>
                <span className={"text-xs font-bold px-2 py-1 rounded-lg " + (z.activa ? "bg-green-950 text-green-400" : "bg-zinc-800 text-zinc-500")}>{z.activa ? "Activa" : "Inactiva"}</span>
              </div>
              {z.descripcion && <p className="text-xs text-zinc-400 mb-2">{z.descripcion}</p>}
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-600 font-mono">{z.lat?.toFixed(4)}, {z.lng?.toFixed(4)}</p>
                {z.lat && z.lng && (
                  <button onClick={() => window.open("https://maps.google.com/?q=" + z.lat + "," + z.lng + "&z=16", "_blank")}
                    className="text-xs text-blue-400 hover:text-blue-300 transition">Ver en mapa →</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-6 max-w-lg w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Nueva Zona de Trabajo</h2>
              <button onClick={() => setMostrarForm(false)} className="text-zinc-400 hover:text-white text-xl font-bold">X</button>
            </div>
            <div className="space-y-3">
              <div><label className={labelClass}>Nombre *</label><input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className={inputClass} spellCheck /></div>
              <div><label className={labelClass}>Tipo</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className={inputClass}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className={labelClass}>Descripcion</label><textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className={inputClass + " resize-none"} rows={2} spellCheck /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass}>Coordenadas GPS</label>
                  <button onClick={obtenerUbicacion} className="text-xs text-blue-400 hover:text-blue-300">Usar mi ubicacion actual</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} placeholder="Latitud" className={inputClass} />
                  <input value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} placeholder="Longitud" className={inputClass} />
                </div>
              </div>
              <div><label className={labelClass}>Radio de geocerca (metros)</label><input type="number" value={form.radio} onChange={e => setForm({...form, radio: parseInt(e.target.value)})} className={inputClass} /></div>
              <div className="flex gap-3">
                <button onClick={() => setMostrarForm(false)} className="flex-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-3 text-sm font-bold text-zinc-300 transition">Cancelar</button>
                <button onClick={guardar} disabled={guardando} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-bold text-white transition disabled:opacity-50">{guardando ? "Guardando..." : "Crear zona"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
