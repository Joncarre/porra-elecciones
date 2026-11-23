/** Utilidades de hora en Europe/Madrid, sin dependencias. */
import { ELECCION } from '../config/eleccion';

const ZONA = ELECCION.zonaHoraria;
const HORA_MS = 3_600_000;

const partesMadrid = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function partes(fecha: Date) {
  const p = Object.fromEntries(partesMadrid.formatToParts(fecha).map((x) => [x.type, x.value]));
  return {
    anio: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
    segundo: Number(p.second),
  };
}

/** Diferencia en minutos entre la hora de Madrid y UTC en ese instante (60 en invierno, 120 en verano). */
function desfaseMinutos(fecha: Date): number {
  const p = partes(fecha);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return Math.round((comoUtc - Math.floor(fecha.getTime() / 1000) * 1000) / 60_000);
}

/** "2026-11-29" + "22:00" (hora de Madrid) → instante ISO en UTC. */
export function madridAIso(fecha: string, hora: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  const aprox = Date.UTC(anio, mes - 1, dia, h, m);
  const desfase = desfaseMinutos(new Date(aprox));
  let instante = aprox - desfase * 60_000;
  // Ajuste fino por si el desfase cambia justo en esa franja (cambio de hora).
  const desfaseReal = desfaseMinutos(new Date(instante));
  if (desfaseReal !== desfase) instante = aprox - desfaseReal * 60_000;
  return new Date(instante).toISOString();
}

/** Valor para un <input type="datetime-local"> en hora de Madrid: "2026-11-29T22:00". */
export function isoAMadridLocal(iso: string): string {
  const p = partes(new Date(iso));
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}T${dos(p.hora)}:${dos(p.minuto)}`;
}

/** "2026-11-29T22:00" (hora de Madrid) → ISO. Devuelve null si no es válido. */
export function madridLocalAIso(valor: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(valor);
  if (!m) return null;
  return madridAIso(m[1], m[2]);
}

/** Hora en punto más cercana a un instante (los desfases de Madrid son horas enteras). */
export function horaEnPuntoMasCercana(ahora: Date): string {
  return new Date(Math.round(ahora.getTime() / HORA_MS) * HORA_MS).toISOString();
}

/** Día siguiente a una fecha "YYYY-MM-DD". */
function diaSiguiente(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

export type Franja = { etiqueta: string; iso: string };

/** Franjas configuradas como instantes. Las horas antes de las 12:00 son de la madrugada siguiente. */
export function franjas(
  fecha: string = ELECCION.fecha,
  horas: readonly string[] = ELECCION.franjas,
): Franja[] {
  return horas.map((etiqueta) => {
    const hora = Number(etiqueta.split(':')[0]);
    const dia = hora < 12 ? diaSiguiente(fecha) : fecha;
    return { etiqueta, iso: madridAIso(dia, etiqueta) };
  });
}

/** Primera franja estrictamente posterior a un instante, o null si ya no quedan. */
export function siguienteFranja(despuesDe: string, lista: readonly Franja[] = franjas()): Franja | null {
  const t = Date.parse(despuesDe);
  return lista.find((f) => Date.parse(f.iso) > t) ?? null;
}
