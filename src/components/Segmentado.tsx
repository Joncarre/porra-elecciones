import { motion } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';

type Opcion<T extends string> = { valor: T; etiqueta: ReactNode; href?: string };

type Props<T extends string> = {
  /** Identificador único (para la animación del indicador). */
  id: string;
  opciones: readonly Opcion<T>[];
  valor: T | null;
  onCambio: (valor: T) => void;
  etiquetaAria: string;
  /** "nav" renderiza enlaces con aria-current; "botones", botones con aria-pressed. */
  modo?: 'nav' | 'botones';
  tamano?: 'normal' | 'pequeno' | 'grande';
  /** "pastilla": redondeado, con la opción activa en blanco (más visible). */
  variante?: 'normal' | 'pastilla';
  className?: string;
};

const alturas = {
  pequeno: 'h-7 px-2.5 text-[12px]',
  normal: 'h-8 px-3.5 text-[13px]',
  grande: 'h-11 px-4 text-[15px]',
};

const ESTILOS = {
  normal: {
    contenedor: 'rounded-[10px] border border-borde bg-superficie p-[3px]',
    opcion: 'rounded-[7px]',
    activa: 'text-texto',
    indicador: 'rounded-[7px] border border-borde-fuerte bg-superficie-2',
  },
  pastilla: {
    contenedor: 'rounded-full border border-borde bg-superficie p-1',
    opcion: 'rounded-full gap-1.5',
    activa: 'text-fondo',
    indicador: 'rounded-full bg-texto shadow-[0_1px_8px_rgba(0,0,0,0.35)]',
  },
};

/** Control segmentado: pestañas de navegación o conmutador de opciones. */
export function Segmentado<T extends string>({
  id,
  opciones,
  valor,
  onCambio,
  etiquetaAria,
  modo = 'botones',
  tamano = 'normal',
  variante = 'normal',
  className = '',
}: Props<T>) {
  const Contenedor = modo === 'nav' ? 'nav' : 'div';
  const e = ESTILOS[variante];
  return (
    <Contenedor
      aria-label={etiquetaAria}
      role={modo === 'nav' ? undefined : 'group'}
      className={`inline-flex ${e.contenedor} ${className}`}
    >
      {opciones.map((o) => {
        const activo = o.valor === valor;
        const clases = `relative flex flex-1 items-center justify-center font-medium whitespace-nowrap transition-colors ${e.opcion} ${alturas[tamano]} ${
          activo ? e.activa : 'text-secundario hover:text-texto'
        }`;
        const contenido = (
          <>
            {activo && (
              <motion.span
                layoutId={`seg-${id}`}
                className={`absolute inset-0 ${e.indicador}`}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                aria-hidden
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">{o.etiqueta}</span>
          </>
        );
        if (modo === 'nav' && o.href) {
          return (
            <a
              key={o.valor}
              href={o.href}
              aria-current={activo ? 'page' : undefined}
              className={clases}
              onClick={(e: MouseEvent) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onCambio(o.valor);
              }}
            >
              {contenido}
            </a>
          );
        }
        return (
          <button key={o.valor} type="button" aria-pressed={activo} className={clases} onClick={() => onCambio(o.valor)}>
            {contenido}
          </button>
        );
      })}
    </Contenedor>
  );
}
