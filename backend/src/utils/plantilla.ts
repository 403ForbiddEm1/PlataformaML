// src/utils/plantilla.ts
// Renderiza plantillas de notificación reemplazando variables {{nombre}}, {{vacante}}, etc.
// Variables desconocidas se dejan vacías. Escapa HTML cuando es necesario.

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderizar(
  texto: string,
  variables: Record<string, string | number | undefined | null>,
  escaparParaHtml = false,
): string {
  return texto.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, clave: string) => {
    const val = variables[clave];
    if (val === undefined || val === null) return '';
    const str = String(val);
    return escaparParaHtml ? escaparHtml(str) : str;
  });
}

