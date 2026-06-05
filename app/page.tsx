"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";
import Sidebar from "../components/Sidebar";
import PanelControl from "../components/PanelControl";
import DashboardAnalytics from "../components/DashboardAnalytics";
import EmpleadosPanel from "../components/EmpleadosPanel";
import FichajeBiometrico from "../components/FichajeBiometrico";
import ProgramacionTurnos from "../components/ProgramacionTurnos";
import ControlTurnos from "../components/ControlTurnos";
import RastreoGPSCorp from "../components/RastreoGPSCorp";
import Puntualidad from "../components/Puntualidad";
import HorasExtra from "../components/HorasExtra";
import ZonasTrabajo from "../components/ZonasTrabajo";
import Productividad from "../components/Productividad";
import Comunicados from "../components/Comunicados";
import MiTurno from "../components/MiTurno";
import PerfilEmpleado from "../components/PerfilEmpleado";
import ReportesCorp from "../components/Reportes";
import BotonSOS from "../components/BotonSOS";

export default function Home() {
  const [activeSection, setActiveSection] = useState("Panel de Control");
  const [rol, setRol] = useState("empleado");
  const [nombre, setNombre] = useState("Usuario");
  const [empleadoId, setEmpleadoId] = useState<number | undefined>();
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function verificarSesion() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data } = await supabase.from("usuarios").select("rol, nombre").eq("id", session.user.id).single();
      if (data) {
        setRol(data.rol || "empleado");
        setNombre(data.nombre || session.user.email?.split("@")[0] || "Usuario");
        if (data.rol === "empleado") {
          setActiveSection("Mi Turno");
          const { data: emp } = await supabase.from("corp_empleados").select("id").ilike("nombre", "%" + (data.nombre?.split(" ")[0] || "") + "%").maybeSingle();
          if (emp) setEmpleadoId(emp.id);
        }
      }
      setCargando(false);
    }
    verificarSesion();
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-blue-400 font-bold text-sm">RSHN CORP</p>
          <p className="text-zinc-500 text-xs mt-1">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  const esEmpleado = rol === "empleado";

  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="flex">
        <Sidebar activeSection={activeSection} onChangeSection={setActiveSection} rol={rol} nombre={nombre} onLogout={cerrarSesion} />
        <section className="flex-1 min-w-0 p-4 md:p-8 md:ml-64 pb-28">
          <div className="pt-14 md:pt-0">
            {activeSection === "Panel de Control" && !esEmpleado && <PanelControl onNavigate={setActiveSection} />}
            {activeSection === "Analitica" && !esEmpleado && <DashboardAnalytics onNavigate={setActiveSection} />}
            {activeSection === "Mis Empleados" && !esEmpleado && <EmpleadosPanel />}
            {activeSection === "Fichaje" && <FichajeBiometrico />}
            {activeSection === "Programacion" && !esEmpleado && <ProgramacionTurnos />}
            {activeSection === "Control de Turnos" && !esEmpleado && <ControlTurnos />}
            {activeSection === "Puntualidad" && !esEmpleado && <Puntualidad />}
            {activeSection === "Horas Trabajadas" && !esEmpleado && <HorasExtra />}
            {activeSection === "Rastreo GPS" && !esEmpleado && <RastreoGPSCorp />}
            {activeSection === "Zonas de Trabajo" && !esEmpleado && <ZonasTrabajo />}
            {activeSection === "Productividad" && !esEmpleado && <Productividad />}
            {activeSection === "Comunicados" && <Comunicados esEmpleado={esEmpleado} />}
            {activeSection === "Mi Turno" && esEmpleado && <MiTurno empleadoId={empleadoId} empleadoNombre={nombre} />}
            {activeSection === "Mi Perfil" && esEmpleado && <PerfilEmpleado empleadoNombre={nombre} />}
            {activeSection === "Reportes" && !esEmpleado && <ReportesCorp />}
            {activeSection === "Configuracion" && rol === "admin" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Configuracion del sistema</h2>
                <p className="text-zinc-500 text-sm">Panel de configuracion avanzada proximamente.</p>
              </div>
            )}
          </div>
        </section>
      </div>
      <BotonSOS nombre={nombre} />
    </main>
  );
}
