import { useState } from 'react';
import { ErrorApi } from '../../lib/api';
import { hora, porcentaje } from '../../lib/formato';
import type { MomentoHistorial } from '../../lib/scoring';
import type { AccionEstado, EstadoPorra, Fase } from '../../types';
import { Boton } from '../ui';

type Props = {
  estado: EstadoPorra;
  fase: Fase;
  ultimo: MomentoHistorial | undefined;
  onAccion: (accion: AccionEstado) => Promise<void>;
};

const lista = (n: string[]) => new Intl.ListFormat('es', { type: 'conjunction' }).format(n);

/**
 * Botones para marcar cuándo empieza y cuándo termina el escrutinio.
 * Al terminarlo, el último dato pasa a ser el resultado final para todos.
 */
export function ControlEscrutinio({ estado, fase, ultimo, onAccion }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(accion: AccionEstado) {
    setOcupado(true);
    setError(null);
    try {
      await onAccion(accion);
      setConfirmando(false);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo cambiar el estado.');
    } finally {
      setOcupado(false);
    }
  }

  const s = ultimo?.snapshot;
  const ganadores = ultimo ? ultimo.clasificacion.filter((f) => f.lider).map((f) => f.porra.nombre) : [];
  const alCien = !!s && s.tipo === 'escrutinio' && s.escrutado >= 100;
  const descripcionUltimo = s ? `${hora(s.momento)} · ${s.tipo === 'sondeo' ? 'sondeo' : `${porcentaje(s.escrutado)} escrutado`}` : '';

  let titulo: string;
  let texto: string;
  if (fase === 'espera') {
    titulo = 'La porra aún no ha empezado';
    texto = 'Pulsa «Iniciar escrutinio» cuando empiece el recuento: la web pasará a «Escrutinio en curso».';
  } else if (fase === 'en-curso') {
    titulo = 'Escrutinio en curso';
    texto = estado.iniciadoEn ? `Desde las ${hora(estado.iniciadoEn)}.` : 'Se abrió al meter el primer dato.';
    if (alCien) texto += ' El último dato ya está al 100 %: puedes cerrar la porra.';
  } else {
    titulo = 'Porra cerrada';
    texto = `${estado.cerradoEn ? `Desde las ${hora(estado.cerradoEn)}. ` : ''}Resultado final: el dato de las ${s ? hora(s.momento) : '—'}.`;
  }

  return (
    <section
      aria-labelledby="escrutinio-titulo"
      className={`mt-6 rounded-[12px] border px-4 py-4 ${fase === 'en-curso' && alCien ? 'border-texto/40' : 'border-borde'}`}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`size-[7px] rounded-full ${fase === 'en-curso' ? 'pulso bg-acento' : fase === 'cerrada' ? 'bg-acento' : 'bg-secundario/50'}`}
        />
        <h2 id="escrutinio-titulo" className="font-display text-[17px] font-semibold">
          {titulo}
        </h2>
      </div>
      <p className="mt-1 text-[13px] text-secundario">{texto}</p>

      {!confirmando && (
        <div className="mt-4 flex flex-wrap gap-2">
          {fase === 'espera' && (
            <Boton variante="primario" onClick={() => ejecutar('iniciar')} disabled={ocupado} className="w-full sm:w-auto">
              {ocupado ? 'Iniciando…' : 'Iniciar escrutinio'}
            </Boton>
          )}
          {fase === 'en-curso' && (
            <>
              <Boton
                variante={alCien ? 'primario' : 'secundario'}
                onClick={() => setConfirmando(true)}
                disabled={ocupado || !s}
                className={alCien ? 'w-full sm:w-auto' : ''}
                title={s ? undefined : 'Mete al menos un dato antes de cerrar'}
              >
                Escrutinio terminado
              </Boton>
              {!s && estado.iniciadoEn && (
                <Boton variante="texto" onClick={() => ejecutar('reiniciar')} disabled={ocupado}>
                  Deshacer el inicio
                </Boton>
              )}
            </>
          )}
          {fase === 'cerrada' && (
            <Boton onClick={() => ejecutar('reabrir')} disabled={ocupado}>
              {ocupado ? 'Reabriendo…' : 'Reabrir escrutinio'}
            </Boton>
          )}
        </div>
      )}

      {confirmando && s && (
        <div role="group" aria-label="Confirmar cierre" className="mt-4 space-y-3 rounded-[10px] border border-borde-fuerte px-3 py-3">
          <p className="text-[14px]">
            El dato de las <strong className="font-semibold">{descripcionUltimo}</strong> quedará como resultado final
            {ganadores.length > 0 && (
              <>
                {' '}y {ganadores.length > 1 ? `${lista(ganadores)} compartirán la victoria` : `${ganadores[0]} ganará la porra`}
              </>
            )}
            . Se puede reabrir si hace falta.
          </p>
          <div className="flex flex-wrap gap-2">
            <Boton variante="primario" onClick={() => ejecutar('cerrar')} disabled={ocupado}>
              {ocupado ? 'Cerrando…' : 'Sí, cerrar la porra'}
            </Boton>
            <Boton variante="texto" onClick={() => setConfirmando(false)} disabled={ocupado}>
              Cancelar
            </Boton>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-error">
          {error}
        </p>
      )}
    </section>
  );
}
