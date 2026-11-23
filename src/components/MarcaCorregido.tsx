import { hora } from '../lib/formato';

/** Marca discreta, visible para todos, de que un dato se corrigió. */
export function MarcaCorregido({ iso, className = '' }: { iso: string; className?: string }) {
  return (
    <span className={`font-mono text-[11px] tracking-[0.02em] text-secundario ${className}`}>
      corregido a las {hora(iso)}
    </span>
  );
}
