/** Geometría de la gráfica de evolución (pura, sin React). */

/** Ticks del eje de posiciones: todos hasta 10 participantes; si hay más, 1, 5, 10… y el último. */
export function ticksPosicion(n: number): number[] {
  if (n <= 1) return [1];
  if (n <= 10) return Array.from({ length: n }, (_, i) => i + 1);
  const ticks = [1];
  for (let k = 5; k < n; k += 5) if (n - k >= 3) ticks.push(k);
  ticks.push(n);
  return ticks;
}

/** Tope "redondo" y ticks para el eje de desviación (de 0 al tope, ~4 tramos). */
export function escalaDesviacion(maximo: number): { tope: number; ticks: number[] } {
  if (!(maximo > 0)) return { tope: 4, ticks: [0, 1, 2, 3, 4] };
  const bruto = maximo / 4;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const norm = bruto / magnitud;
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const paso = Math.max(1, factor * magnitud);
  const tope = Math.ceil(maximo / paso) * paso;
  const ticks: number[] = [];
  for (let v = 0; v <= tope + 1e-9; v += paso) ticks.push(Math.round(v * 100) / 100);
  return { tope, ticks };
}

/**
 * Coloca una etiqueta por línea al final de la gráfica sin que se solapen:
 * cada una se queda lo más cerca posible de su línea, con al menos `separacion` px
 * entre etiquetas y dentro de [min, max]. Conserva el orden de entrada en los empates.
 */
export function colocarEtiquetas<T extends { y: number }>(
  items: readonly T[],
  separacion: number,
  min: number,
  max: number,
): (T & { yEtiqueta: number })[] {
  const orden = items.map((item, i) => ({ item, i })).sort((a, b) => a.item.y - b.item.y || a.i - b.i);
  const n = orden.length;
  if (n === 0) return [];
  const pos = orden.map(({ item }) => Math.min(max, Math.max(min, item.y)));

  for (let k = 1; k < n; k++) pos[k] = Math.max(pos[k], pos[k - 1] + separacion);
  if (pos[n - 1] > max) {
    pos[n - 1] = max;
    for (let k = n - 2; k >= 0; k--) pos[k] = Math.min(pos[k], pos[k + 1] - separacion);
  }
  // Si no caben todas con esa separación, se reparten por igual en el espacio disponible.
  if (pos[0] < min) {
    for (let k = 0; k < n; k++) pos[k] = n === 1 ? min : min + (k * (max - min)) / (n - 1);
  }
  return orden.map(({ item }, k) => ({ ...item, yEtiqueta: pos[k] }));
}
