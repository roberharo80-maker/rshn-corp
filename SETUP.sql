-- RSHN CORP — Tablas en Supabase
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS corp_empleados (
  id serial PRIMARY KEY,
  codigo text NOT NULL,
  nombre text NOT NULL,
  cedula text NOT NULL,
  cargo text DEFAULT 'Empleado',
  empresa text DEFAULT '',
  zona_trabajo text DEFAULT '',
  telefono text DEFAULT '',
  estado text DEFAULT 'Activo',
  hora_entrada text DEFAULT '08:00',
  hora_salida text DEFAULT '17:00',
  zona_lat decimal,
  zona_lng decimal,
  zona_radio integer DEFAULT 200,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS corp_turnos (
  id serial PRIMARY KEY,
  empleado_id integer,
  empleado_nombre text NOT NULL,
  zona_trabajo text DEFAULT '',
  fecha date NOT NULL,
  hora_entrada_prog text,
  hora_salida_prog text,
  hora_entrada_real text,
  hora_salida_real text,
  tardanza boolean DEFAULT false,
  minutos_tardanza integer DEFAULT 0,
  estado text DEFAULT 'ausente',
  en_zona boolean DEFAULT true,
  observaciones text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS corp_empleados_ubicacion (
  id serial PRIMARY KEY,
  empleado_id integer UNIQUE,
  nombre text NOT NULL,
  ultima_latitud decimal,
  ultima_longitud decimal,
  ultimo_movimiento timestamptz,
  en_zona boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS corp_zonas (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text DEFAULT '',
  lat decimal DEFAULT 0,
  lng decimal DEFAULT 0,
  radio integer DEFAULT 200,
  tipo text DEFAULT 'Obra',
  activa boolean DEFAULT true,
  empleados_asignados integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS corp_alertas (
  id serial PRIMARY KEY,
  empleado_nombre text NOT NULL,
  tipo text NOT NULL,
  descripcion text DEFAULT '',
  resuelta boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE corp_empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE corp_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE corp_empleados_ubicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE corp_zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE corp_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_corp_empleados" ON corp_empleados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_corp_turnos" ON corp_turnos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_corp_ubicacion" ON corp_empleados_ubicacion FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_corp_zonas" ON corp_zonas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_corp_alertas" ON corp_alertas FOR ALL USING (true) WITH CHECK (true);

-- Tabla de comunicados
CREATE TABLE IF NOT EXISTS corp_comunicados (
  id serial PRIMARY KEY,
  titulo text NOT NULL,
  contenido text NOT NULL,
  tipo text DEFAULT 'General',
  prioridad text DEFAULT 'Normal',
  creado_por text DEFAULT 'Supervisor',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE corp_comunicados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_corp_comunicados" ON corp_comunicados FOR ALL USING (true) WITH CHECK (true);
