import { textoCambio } from '../lib/formato';

/** ▲2 en verde si sube, ▼1 en rojo si baja, — si se mantiene (la flecha y la cifra acompañan siempre al color). */
export function CambioPuesto({ cambio, className = '' }: { cambio: number | null; className?: string }) {
  const sube = cambio !== null && cambio > 0;
  const baja = cambio !== null && cambio < 0;
  const texto = sube ? `▲${cambio}` : baja ? `▼${-cambio!}` : '—';
  const color = sube ? 'text-sube' : baja ? 'text-baja' : 'text-secundario';
  return (
    <span className={`text-right font-mono text-[11px] ${color} ${className}`} title={textoCambio(cambio)}>
      <span aria-hidden>{texto}</span>
      <span className="sr-only">{textoCambio(cambio)}</span>
    </span>
  );
}
