import { useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { hora, numero, ordinal, porcentaje, puntos } from '../lib/formato';
import { colocarEtiquetas, escalaDesviacion, ticksPosicion } from '../lib/grafica';
import { seriesEvolucion, type MomentoHistorial } from '../lib/scoring';
import { TEMA } from '../lib/tema';
import type { Porra } from '../types';
import { MarcaCorregido } from './MarcaCorregido';
import { Segmentado } from './Segmentado';

type Modo = 'posicion' | 'desviacion';

type Props = {
  historial: MomentoHistorial[];
  porras: readonly Porra[];
  colores: Record<string, string>;
  resaltado: string | null;
  onHover: (id: string | null) => void;
  onFijar: (id: string) => void;
};

function IconoPosicion() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="0.5" y="6" width="4" height="7.5" rx="1" />
      <rect x="5" y="1.5" width="4" height="12" rx="1" />
      <rect x="9.5" y="8.5" width="4" height="5" rx="1" />
    </svg>
  );
}

function IconoDesviacion() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3.5 L5 7 L8 5.5 L13 11" />
      <path d="M9.5 11 H13 V7.5" />
    </svg>
  );
}

const MODOS = [
  {
    valor: 'posicion',
    etiqueta: (
      <>
        <IconoPosicion /> Posición
      </>
    ),
  },
  {
    valor: 'desviacion',
    etiqueta: (
      <>
        <IconoDesviacion /> Desviación
      </>
    ),
  },
] as const;

// Geometría fija (en px) para poder calcular dónde caen las etiquetas.
const MARGEN_SUP = 14;
const MARGEN_INF = 4;
const ALTO_EJE_X = 38;
const PAD_Y = 10;
const ANCHO_EJE_Y = 34;
const PAD_X_DER = 10;
const SEPARACION_ETIQUETAS = 16;

export function Evolucion({ historial, porras, colores, resaltado, onHover, onFijar }: Props) {
  const [modo, setModo] = useState<Modo>('posicion');
  const reducir = useReducedMotion() ?? false;

  const puntosSerie = useMemo(() => seriesEvolucion(historial), [historial]);
  const mapa = useMemo(() => new Map(historial.map((m) => [m.snapshot.id, m])), [historial]);
  const filas = useMemo(
    () =>
      puntosSerie.map((p) => {
        const fila: Record<string, number | string> = { id: p.snapshotId };
        for (const porra of porras) {
          fila[`posicion:${porra.id}`] = p.posicion[porra.id];
          fila[`desviacion:${porra.id}`] = p.desviacion[porra.id];
        }
        return fila;
      }),
    [puntosSerie, porras],
  );

  const cabecera = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <h2 id="evolucion-titulo" className="font-display text-[19px] font-semibold">
        Evolución
      </h2>
      {historial.length >= 2 && (
        <Segmentado
          id="modo-grafica"
          etiquetaAria="Qué muestra la gráfica"
          opciones={MODOS}
          valor={modo}
          onCambio={setModo}
          variante="pastilla"
        />
      )}
    </div>
  );

  if (historial.length < 2) {
    return (
      <section aria-labelledby="evolucion-titulo" className="mt-14">
        {cabecera}
        <EstadoVacio />
      </section>
    );
  }

  const n = porras.length;
  const ultimo = historial[historial.length - 1];
  const alto = Math.min(480, Math.max(260, 32 * n + 110));
  const altoInterior = alto - MARGEN_SUP - MARGEN_INF - ALTO_EJE_X - 2 * PAD_Y;
  const arriba = MARGEN_SUP + PAD_Y;
  const abajo = arriba + altoInterior;

  // Escala Y
  let dominio: [number, number];
  let ticks: number[];
  let yDe: (v: number) => number;
  if (modo === 'posicion') {
    dominio = [1, Math.max(n, 2)];
    ticks = ticksPosicion(n);
    yDe = (v) => arriba + ((v - 1) / (dominio[1] - 1)) * altoInterior;
  } else {
    const maximo = Math.max(...puntosSerie.flatMap((p) => Object.values(p.desviacion)));
    const escala = escalaDesviacion(maximo);
    dominio = [0, escala.tope];
    ticks = escala.ticks;
    yDe = (v) => arriba + ((escala.tope - v) / escala.tope) * altoInterior;
  }

  // Una etiqueta por persona al final de su línea, sin solaparse (en orden de clasificación).
  const finales = puntosSerie[puntosSerie.length - 1];
  const etiquetas = colocarEtiquetas(
    ultimo.clasificacion.map((f) => ({
      id: f.porra.id,
      nombre: f.porra.nombre,
      y: yDe(modo === 'posicion' ? finales.posicion[f.porra.id] : finales.desviacion[f.porra.id]),
    })),
    SEPARACION_ETIQUETAS,
    arriba - 4,
    abajo + 4,
  );
  const largoMax = Math.max(...porras.map((p) => p.nombre.length), 4);
  const margenDer = Math.min(136, Math.max(64, Math.round(largoMax * 7.2) + 26));

  // Orden de dibujo: la persona resaltada, encima.
  const ordenDibujo = [...porras].sort((a, b) => Number(a.id === resaltado) - Number(b.id === resaltado));
  const estilo = (id: string) => {
    const esResaltado = resaltado === id;
    return {
      color: colores[id] ?? TEMA.secundario,
      opacidad: resaltado !== null && !esResaltado ? 0.18 : 1,
      ancho: esResaltado ? 3 : 2,
    };
  };

  const corregidos = historial.filter((m) => m.snapshot.editadoEn);

  return (
    <section aria-labelledby="evolucion-titulo" className="mt-14">
      {cabecera}
      <p className="mt-2 text-[12px] text-secundario">
        {modo === 'posicion' ? 'Puesto en cada hora; arriba, el primero.' : 'Desviación total en cada hora; cuanto más baja, mejor.'}
      </p>

      <div className="relative mt-4 select-none" style={{ height: alto }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filas}
            accessibilityLayer={false}
            margin={{ top: MARGEN_SUP, right: margenDer, bottom: MARGEN_INF, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke={TEMA.rejilla} />
            <XAxis
              dataKey="id"
              height={ALTO_EJE_X}
              interval={0}
              tickLine={false}
              axisLine={{ stroke: TEMA.eje }}
              padding={{ left: 14, right: PAD_X_DER }}
              tick={({ x, y, payload }) => {
                const m = mapa.get(String(payload.value));
                if (!m) return <g />;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text dy={14} textAnchor="middle" fill={TEMA.secundario} fontSize={11} className="font-mono">
                      {hora(m.snapshot.momento)}
                      {m.snapshot.editadoEn ? '*' : ''}
                    </text>
                    {m.snapshot.tipo === 'sondeo' && (
                      <text dy={28} textAnchor="middle" fill={TEMA.secundario} fontSize={9} letterSpacing={0.6} className="font-mono">
                        SONDEO
                      </text>
                    )}
                  </g>
                );
              }}
            />
            <YAxis
              width={ANCHO_EJE_Y}
              reversed={modo === 'posicion'}
              domain={dominio}
              ticks={ticks}
              interval={0}
              allowDecimals={modo === 'desviacion'}
              tickLine={false}
              axisLine={false}
              padding={{ top: PAD_Y, bottom: PAD_Y }}
              tick={{ fill: TEMA.secundario, fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
              tickFormatter={(v: number) => (modo === 'posicion' ? ordinal(v) : numero(v))}
            />
            {ordenDibujo.map((p) => {
              const e = estilo(p.id);
              return (
                <Line
                  key={`${modo}-${p.id}`}
                  dataKey={`${modo}:${p.id}`}
                  name={p.nombre}
                  type={modo === 'posicion' ? 'bumpX' : 'monotone'}
                  stroke={e.color}
                  strokeOpacity={e.opacidad}
                  strokeWidth={e.ancho}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  isAnimationActive={!reducir}
                  animationDuration={500}
                  activeDot={false}
                  dot={(props) => {
                    const { cx, cy, index, payload } = props as { cx?: number; cy?: number; index: number; payload: { id: string } };
                    const k = `${p.id}-${index}`;
                    if (cx == null || cy == null) return <g key={k} />;
                    const sondeo = mapa.get(payload.id)?.snapshot.tipo === 'sondeo';
                    return (
                      <circle
                        key={k}
                        cx={cx}
                        cy={cy}
                        r={e.ancho > 2 ? 4.5 : 4}
                        fill={sondeo ? TEMA.fondo : e.color}
                        stroke={sondeo ? e.color : TEMA.fondo}
                        strokeWidth={sondeo ? 1.75 : 2}
                        opacity={e.opacidad}
                      />
                    );
                  }}
                />
              );
            })}
            {/* Zonas de contacto anchas e invisibles: pasar el ratón o tocar resalta a esa persona. */}
            {porras.map((p) => (
              <Line
                key={`hit-${modo}-${p.id}`}
                dataKey={`${modo}:${p.id}`}
                type={modo === 'posicion' ? 'bumpX' : 'monotone'}
                stroke="transparent"
                strokeWidth={16}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                legendType="none"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => onHover(p.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onFijar(p.id)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Nombres al final de cada línea, en su color, unidos a su punto con un trazo fino. */}
        <div className="absolute top-0 right-0" style={{ width: margenDer + PAD_X_DER, height: alto }}>
          <svg className="absolute inset-0" width={margenDer + PAD_X_DER} height={alto} aria-hidden>
            {etiquetas.map((et) => (
              <path
                key={et.id}
                d={`M 5 ${et.y} L 9 ${et.y} L 15 ${et.yEtiqueta} L 18 ${et.yEtiqueta}`}
                fill="none"
                stroke={colores[et.id]}
                strokeWidth={1}
                strokeOpacity={resaltado !== null && resaltado !== et.id ? 0.18 : 0.7}
              />
            ))}
          </svg>
          {etiquetas.map((et) => {
            const esResaltado = resaltado === et.id;
            const atenuada = resaltado !== null && !esResaltado;
            return (
              <button
                key={et.id}
                type="button"
                tabIndex={-1}
                onClick={() => onFijar(et.id)}
                onPointerEnter={(ev) => ev.pointerType === 'mouse' && onHover(et.id)}
                onPointerLeave={(ev) => ev.pointerType === 'mouse' && onHover(null)}
                className={`absolute h-4 truncate text-left font-display text-[12px] leading-4 transition-opacity ${
                  esResaltado ? 'font-bold' : 'font-medium'
                } ${atenuada ? 'opacity-30' : ''}`}
                style={{ top: et.yEtiqueta - 8, left: 20, width: margenDer - 12, color: colores[et.id] }}
              >
                {et.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {corregidos.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {corregidos.map((m) => (
            <li key={m.snapshot.id} className="font-mono text-[11px] text-secundario">
              * {hora(m.snapshot.momento)} · <MarcaCorregido iso={m.snapshot.editadoEn!} />
            </li>
          ))}
        </ul>
      )}

      <TablaAccesible historial={historial} porras={porras} />
    </section>
  );
}

function EstadoVacio() {
  return (
    <div className="mt-4 flex flex-col items-center gap-4 rounded-[12px] border border-borde bg-superficie px-6 py-10 text-center">
      <svg aria-hidden width="132" height="44" viewBox="0 0 132 44" fill="none">
        <path d="M4 34 C 30 34, 36 12, 66 14 S 104 30, 128 8" stroke={TEMA.eje} strokeWidth="2" strokeLinecap="round" />
        <circle cx="4" cy="34" r="4" fill={TEMA.texto} stroke={TEMA.superficie} strokeWidth="2" />
        <circle cx="66" cy="14" r="3.5" fill={TEMA.superficie} stroke={TEMA.eje} strokeWidth="1.5" />
        <circle cx="128" cy="8" r="3.5" fill={TEMA.superficie} stroke={TEMA.eje} strokeWidth="1.5" />
      </svg>
      <p className="max-w-xs text-[14px] text-secundario">
        La evolución aparecerá con el segundo dato. Habrá uno por hora durante el escrutinio.
      </p>
    </div>
  );
}

/** Versión en tabla para lectores de pantalla. */
function TablaAccesible({ historial, porras }: { historial: MomentoHistorial[]; porras: readonly Porra[] }) {
  const orden = historial[historial.length - 1].clasificacion.map((f) => f.porra);
  return (
    <div className="sr-only">
      <table>
        <caption>Posición y desviación de cada participante en cada hora</caption>
        <thead>
          <tr>
            <th scope="col">Participante</th>
            {historial.map((m) => (
              <th key={m.snapshot.id} scope="col">
                {hora(m.snapshot.momento)} {m.snapshot.tipo === 'sondeo' ? '(sondeo)' : `(${porcentaje(m.snapshot.escrutado)} escrutado)`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(orden.length ? orden : porras).map((p) => (
            <tr key={p.id}>
              <th scope="row">{p.nombre}</th>
              {historial.map((m) => {
                const f = m.clasificacion.find((x) => x.porra.id === p.id);
                return <td key={m.snapshot.id}>{f ? `${ordinal(f.posicion)}, desviación ${puntos(f.desviacion.totalCent)}` : '—'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
