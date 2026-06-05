# RSHN CORP — Instrucciones de Deploy

## 1. Ejecutar SQL en Supabase
Ve a Supabase → SQL Editor y ejecuta el contenido de SETUP.sql

## 2. Crear repositorio en GitHub
- Ve a github.com → New repository
- Nombre: rshn-corp
- Privado
- Sin README

## 3. Subir el código
Abre PowerShell en la carpeta del proyecto y ejecuta uno por uno:

```
git init
git add .
git commit -m "feat: RSHN CORP inicial — Control de Fuerza Laboral"
git branch -M main
git remote add origin https://github.com/roberharo80-maker/rshn-corp.git
git push -u origin main
```

## 4. Crear proyecto en Vercel
- Ve a vercel.com → New Project
- Importa el repositorio rshn-corp
- Framework: Next.js

## 5. Variables de entorno en Vercel
Agrega estas variables en Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://mpjnnpzoycfbfgddzdff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_AOMhLUsE4V5MHE6z5qkT4w_xzstl6U_
NEXT_PUBLIC_ULTRAMSG_INSTANCE=instance178772
NEXT_PUBLIC_ULTRAMSG_TOKEN=66e3npxnycqixfiy
GROQ_API_KEY=TU_GROQ_API_KEY_AQUI
```

## 6. Deploy
Vercel despliega automaticamente. URL: rshn-corp.vercel.app

## Credenciales de prueba
Mismos usuarios de RSHN OPS:
- rober@rshnops.com / Rshn2026! (admin)
- guillermo@rshnops.com / Rshn2026! (supervisor)
- alfonso@rshnops.com / Rshn2026! (supervisor)
- jhon@rshnops.com / Rshn2026! (empleado)
