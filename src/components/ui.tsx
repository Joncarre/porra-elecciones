import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'texto';

const VARIANTES: Record<Variante, string> = {
  primario:
    'h-12 rounded-[10px] bg-texto px-5 text-[15px] font-semibold text-fondo hover:bg-white disabled:bg-texto/30 disabled:text-fondo/70',
  secundario:
    'h-9 rounded-[8px] border border-borde-fuerte bg-superficie px-3 text-[13px] font-medium text-texto hover:bg-superficie-2 disabled:opacity-40',
  peligro:
    'h-9 rounded-[8px] border border-error/40 px-3 text-[13px] font-medium text-error hover:bg-error/10 disabled:opacity-40',
  texto: 'h-9 px-1 text-[13px] text-secundario underline-offset-4 hover:text-texto hover:underline',
};

export function Boton({
  variante = 'secundario',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  );
}

/** Input grande, pensado para el móvil. */
export const claseInput =
  'h-12 w-full rounded-[10px] border border-borde bg-superficie px-3 font-display text-[19px] text-texto placeholder:text-secundario/70 hover:border-borde-fuerte focus:border-borde-fuerte aria-[invalid=true]:border-error/60 disabled:opacity-40';

export const claseEtiqueta = 'mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-secundario';
