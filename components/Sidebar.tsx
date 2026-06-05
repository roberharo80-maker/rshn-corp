"use client";
import { useState } from "react";

type Props = { activeSection: string; onChangeSection: (s: string) => void; rol?: string; nombre?: string; onLogout?: () => void; };

const SUPERVISOR_MENU = [
  { label: "Panel de Control", icon: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" },
  { label: "Analitica", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Mis Empleados", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { label: "Fichaje", icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" },
  { label: "Programacion", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Control de Turnos", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { label: "Puntualidad", icon: "M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2" },
  { label: "Horas Trabajadas", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Rastreo GPS", icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10a2 2 0 100-4 2 2 0 000 4z" },
  { label: "Zonas de Trabajo", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { label: "Productividad", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { label: "Comunicados", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { label: "Reportes", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Configuracion", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const EMPLEADO_MENU = [
  { label: "Mi Turno", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Mi Perfil", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { label: "Comunicados", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
];

export default function Sidebar({ activeSection, onChangeSection, rol = "empleado", nombre, onLogout }: Props) {
  const [abierto, setAbierto] = useState(false);
  const items = rol === "empleado" ? EMPLEADO_MENU : SUPERVISOR_MENU;

  return (
    <>
      <button onClick={() => setAbierto(!abierto)} className="fixed top-4 left-4 z-50 md:hidden bg-zinc-900 border border-zinc-700 rounded-xl p-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      {abierto && <div onClick={() => setAbierto(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden" />}
      <aside className={`fixed left-0 top-0 h-full z-40 w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col transition-transform md:translate-x-0 ${abierto ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm">R</div>
            <div>
              <p className="text-sm font-black text-white">RSHN CORP</p>
              <p className="text-xs text-blue-400">Control Laboral</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-950 border border-green-900">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Sistema activo</span>
          </div>
          {nombre && (
            <div className="mt-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-xs text-zinc-500">Usuario</p>
              <p className="text-sm font-bold text-white truncate">{nombre}</p>
              <p className="text-xs text-blue-400 capitalize">{rol}</p>
            </div>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {items.map(item => (
            <button key={item.label} onClick={() => { onChangeSection(item.label); setAbierto(false); }}
              className={"w-full rounded-xl px-3 py-2.5 text-left text-sm transition flex items-center gap-3 " + (activeSection === item.label ? "bg-blue-600 text-white font-medium" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200")}>
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" className="flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800">
          {onLogout && (
            <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition text-sm mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Cerrar sesion
            </button>
          )}
          <p className="text-xs text-zinc-700 text-center">@HombreDeSeguridad · 2026</p>
        </div>
      </aside>
    </>
  );
}
