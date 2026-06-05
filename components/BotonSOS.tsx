"use client";
import { useState, useRef } from "react";

export default function BotonSOS({ nombre }: { nombre?: string }) {
  const [fase, setFase] = useState<"idle"|"presionando"|"enviando"|"enviado">("idle");
  const [progreso, setProgreso] = useState(0);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);

  function iniciar() {
    if (fase !== "idle") return;
    setFase("presionando"); setProgreso(0);
    const inicio = Date.now();
    intervaloRef.current = setInterval(() => {
      const p = Math.min(((Date.now() - inicio) / 3000) * 100, 100);
      setProgreso(p);
      if (p >= 100) { clearInterval(intervaloRef.current!); activar(); }
    }, 50);
  }

  function cancelar() {
    if (fase !== "presionando") return;
    clearInterval(intervaloRef.current!);
    setFase("idle"); setProgreso(0);
  }

  async function activar() {
    setFase("enviando");
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 400]);
    let lat = "", lng = "";
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      lat = pos.coords.latitude.toFixed(6);
      lng = pos.coords.longitude.toFixed(6);
    } catch {}
    await fetch("/api/whatsapp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensaje: "🚨 *ALERTA SOS - RSHN CORP*\n\n👤 *EMPLEADO:* " + (nombre || "Empleado") + "\n" +
          (lat ? "📍 *UBICACION:* https://maps.google.com/?q=" + lat + "," + lng + "\n" : "") +
          "⏰ " + new Date().toLocaleString("es-EC") + "\n\n_Responda inmediatamente_",
        grupo: true,
      }),
    }).catch(() => {});
    setFase("enviado");
    setTimeout(() => { setFase("idle"); setProgreso(0); }, 5000);
  }

  if (fase === "enviado") return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="rounded-full w-20 h-20 bg-green-700 flex items-center justify-center">
        <span className="text-white text-xs font-black text-center">ENVIADO</span>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
      {fase === "presionando" && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1 text-xs text-yellow-400 font-bold animate-pulse">
          Mantén {Math.ceil((100 - progreso) / 33)}s...
        </div>
      )}
      <button
        onMouseDown={iniciar} onMouseUp={cancelar} onMouseLeave={cancelar}
        onTouchStart={e => { e.preventDefault(); iniciar(); }} onTouchEnd={cancelar}
        className="relative w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 shadow-2xl shadow-red-900 flex flex-col items-center justify-center select-none"
        style={{ touchAction: "none" }}
      >
        {fase === "presionando" && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
            <circle cx="40" cy="40" r="36" fill="none" stroke="white" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - progreso / 100)}`}
              strokeLinecap="round" />
          </svg>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <span className="text-white font-black text-xs mt-0.5">SOS</span>
      </button>
      {fase === "idle" && <p className="text-zinc-600 text-xs text-center">Mantén 3 seg</p>}
    </div>
  );
}
