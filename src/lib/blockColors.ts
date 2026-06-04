// Colores de fondo por bloque. Modificar aqui para cambiar en toda la app.

export const BLOCK_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  A: { bg: 'bg-pink-100', border: 'border-pink-300', label: 'Rosa' },
  B: { bg: 'bg-sky-100', border: 'border-sky-300', label: 'Celeste' },
  C: { bg: 'bg-orange-100', border: 'border-orange-300', label: 'Naranja' },
  D: { bg: 'bg-green-100', border: 'border-green-300', label: 'Verde' },
  E: { bg: 'bg-yellow-100', border: 'border-yellow-300', label: 'Amarillo' },
  F: { bg: 'bg-purple-100', border: 'border-purple-300', label: 'Violeta' },
  G: { bg: 'bg-teal-100', border: 'border-teal-300', label: 'Teal' },
  H: { bg: 'bg-rose-100', border: 'border-rose-300', label: 'Rosa oscuro' },
}

export const DEFAULT_BLOCK_COLOR = { bg: 'bg-gray-100', border: 'border-gray-300', label: 'Gris' }

export function getBlockColor(blockLetter: string) {
  return BLOCK_COLORS[blockLetter.toUpperCase()] ?? DEFAULT_BLOCK_COLOR
}
