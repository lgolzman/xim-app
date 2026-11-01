import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({ define:{'process.env.NODE_ENV':JSON.stringify('production'),'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('https://preview.supabase.co'),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify('preview-only')}, build:{outDir:'dist-preview',lib:{entry:'planner-preview/main.tsx',name:'XimPlannerPreview',formats:['iife'],fileName:()=> 'preview.js'},cssCodeSplit:false}, plugins:[{ name:'preview-header', enforce:'pre', resolveId(source,importer){if(source==='./Header' && importer?.endsWith('/components/layout/Layout.tsx')) return fileURLToPath(new URL('./planner-preview/Header.tsx',import.meta.url))} },react(),tailwindcss()], server:{host:'127.0.0.1',port:5174,strictPort:true} })
