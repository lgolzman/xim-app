import { readFileSync, writeFileSync } from 'node:fs'
const css=readFileSync('dist-preview/xim_app.css','utf8')
const js=readFileSync('dist-preview/preview.js','utf8').replaceAll('</script','<\\/script')
writeFileSync('dist-preview/planificador.html',`<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>XIM · Planificador semanal</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`)
