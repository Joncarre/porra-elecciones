import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { BLOQUES } from '../config/eleccion';
import { conSigno, decimalesComunes, porcentaje, puntos } from '../lib/formato';
import { fraseBloque, fraseParticipacion } from '../lib/frases';
import { avisoSuma } from '../lib/porras';
import type { FilaClasificacion, MomentoHistorial, Resultado } from '../lib/scoring';
import { CambioPuesto } from './CambioPuesto';

type Props = {
  momento: MomentoHistorial;
  final: boolean;
  colores: Record<string, string>;
  resaltado: string | null;
  onHover: (id: string | null) => void;
  abierta: string | null;
  onAbrir: (id: string | null) => void;
};

export function Clasificacion({ momento, final, colores, resaltado, onHover, abierta, onAbrir }: Props) {
  const decimales = decimalesComunes(momento.clasificacion.map((f) => f.desviacion.totalCent));

  return (
    <section aria-labelledby="clasificacion-titulo" className="mt-12">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="clasificacion-titulo" className="font-display text-[19px] font-semibold">
          {final ? 'Resultado final' : 'Clasificación'}
        </h2>
        <span className="etiqueta">Desviación</span>
      </div>

      <LayoutGroup>
        <ol className="mt-4 border-t border-borde">
          {momento.clasificacion.map((fila) => (
            <Fila
              key={fila.porra.id}
              fila={fila}
              real={momento.snapshot}
              cambio={momento.cambios[fila.porra.id] ?? null}
              final={final}
              color={colores[fila.porra.id]}
              decimales={decimales}
              abierta={abierta === fila.porra.id}
              resaltada={resaltado === fila.porra.id}
              onAlternar={() => onAbrir(abierta === fila.porra.id ? null : fila.porra.id)}
              onHover={onHover}
            />
          ))}
        </ol>
      </LayoutGroup>
    </section>
  );
}

type PropsFila = {
  fila: FilaClasificacion;
  real: Resultado;
  cambio: number | null;
  final: boolean;
  color: string | undefined;
  decimales: number;
  abierta: boolean;
  resaltada: boolean;
  onAlternar: () => void;
  onHover: (id: string | null) => void;
};

function Fila({ fila, real, cambio, final, color, decimales, abierta, resaltada, onAlternar, onHover }: PropsFila) {
  const { porra, desviacion, posicion, lider } = fila;
  const aviso = avisoSuma(porra);
  const idDesglose = `desglose-${porra.id}`;
  const colorLider = lider ? 'text-acento' : '';

  return (
    <motion.li
      layout="position"
      transition={{ type: 'spring', stiffness: 420, damping: 40 }}
      className={`border-b border-borde transition-colors ${resaltada ? 'bg-white/[0.025]' : ''}`}
    >
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={idDesglose}
        onClick={onAlternar}
        onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(porra.id)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
        className="grid w-full grid-cols-[1.75rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 py-3.5 text-left"
      >
        <span className={`font-mono text-[13px] ${lider ? 'text-acento' : 'text-secundario'}`}>
          <span className="sr-only">Posición </span>
          {posicion}
        </span>
        <span className="flex min-w-0 items-center gap-2.5">
          {color && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />}
          <span className={`truncate font-display text-[17px] font-medium ${colorLider}`}>{porra.nombre}</span>
          {aviso && (
            <span className="shrink-0 font-mono text-[11px] text-secundario" title="Esta porra no suma 350 escaños">
              {aviso}
            </span>
          )}
        </span>
        <CambioPuesto cambio={cambio} className="w-9" />
        <span className={`min-w-[3.75rem] text-right font-display text-[20px] leading-none font-semibold ${colorLider}`}>
          <span className="sr-only">Desviación total </span>
          {puntos(desviacion.totalCent, decimales)}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            id={idDesglose}
            key="desglose"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <Desglose fila={fila} real={real} final={final} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function Desglose({ fila, real, final }: { fila: FilaClasificacion; real: Resultado; final: boolean }) {
  const { porra, desviacion } = fila;
  const celda = 'py-1 text-center font-mono text-[13px]';
  const cabecera = 'pb-1.5 text-center text-[11px] font-normal leading-tight text-secundario';

  return (
    <div className="px-4 pb-4 sm:pl-[calc(1rem+1.75rem+0.75rem)]">
      <table className="w-full max-w-md table-fixed border-collapse text-[13px]">
        <caption className="sr-only">
          Desglose de {porra.nombre}: apuesta, {final ? 'resultado final' : 'resultado actual'} y desviación
        </caption>
        <colgroup>
          <col className="w-[28%]" />
          <col />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={`${cabecera} !text-left`}>
              <span className="sr-only">Bloque</span>
            </th>
            <th scope="col" className={cabecera}>
              Tu apuesta
            </th>
            <th scope="col" className={cabecera}>
              {final ? 'Resultado final' : 'Resultado actual'}
            </th>
            <th scope="col" className={cabecera}>
              Desviación
            </th>
          </tr>
        </thead>
        <tbody>
          {BLOQUES.map((b) => {
            const d = desviacion.bloques[b.id];
            return (
              <tr key={b.id}>
                <th scope="row" className="py-1 text-left font-normal text-secundario">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: b.color }} />
                    {b.corto}
                  </span>
                </th>
                <td className={`${celda} text-secundario`}>{porra.escanos[b.id]}</td>
                <td className={celda}>{real.escanos[b.id]}</td>
                <td className={`${celda} ${d === 0 ? 'text-secundario' : ''}`}>
                  <span aria-hidden>{conSigno(d)}</span>
                  <span className="sr-only">{fraseBloque(b, d, porra.nombre)}</span>
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-borde">
            <th scope="row" className="pt-2 pb-1 text-left font-normal text-secundario">
              Participación
            </th>
            <td className={`${celda} pt-2 text-secundario`}>{porcentaje(porra.participacion)}</td>
            <td className={`${celda} pt-2`}>{porcentaje(real.participacion)}</td>
            <td className={`${celda} pt-2 ${desviacion.participacionCent === 0 ? 'text-secundario' : ''}`}>
              <span aria-hidden>{conSigno(desviacion.participacionCent / 100)}</span>
              <span className="sr-only">{fraseParticipacion(desviacion.participacionCent, porra.nombre)}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
