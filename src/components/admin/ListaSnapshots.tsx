import { useState } from 'react';
import { BLOQUES } from '../../config/eleccion';
import { ErrorApi } from '../../lib/api';
import { hora, porcentaje } from '../../lib/formato';
import { ordenarSnapshots } from '../../lib/snapshots';
import type { Snapshot } from '../../types';
import { MarcaCorregido } from '../MarcaCorregido';
import { Boton } from '../ui';

type Props = {
  snapshots: readonly Snapshot[];
  editandoId: string | null;
  onEditar: (s: Snapshot) => void;
  onBorrar: (s: Snapshot) => Promise<void>;
};

/** Datos introducidos, del más reciente al más antiguo, con editar y borrar. */
export function ListaSnapshots({ snapshots, editandoId, onEditar, onBorrar }: Props) {
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lista = ordenarSnapshots(snapshots).reverse();

  async function borrar(s: Snapshot) {
    setBorrando(s.id);
    setError(null);
    try {
      await onBorrar(s);
      setConfirmando(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo borrar.');
    } finally {
      setBorrando(null);
    }
  }

  return (
    <section aria-labelledby="datos-titulo" className="mt-12">
      <div className="flex items-baseline justify-between">
        <h2 id="datos-titulo" className="font-display text-[19px] font-semibold">
          Datos introducidos
        </h2>
        <span className="etiqueta">{snapshots.length}</span>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-error">
          {error}
        </p>
      )}
      {lista.length === 0 ? (
        <p className="mt-3 text-[14px] text-secundario">Todavía no hay ninguno.</p>
      ) : (
        <ul className="mt-3 border-t border-borde">
          {lista.map((s) => (
            <li key={s.id} className={`border-b border-borde py-3 ${editandoId === s.id ? 'bg-white/[0.025]' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 font-mono text-[13px]">
                  <span className="text-texto">{hora(s.momento)}</span>
                  <span className="text-secundario">
                    {' · '}
                    {s.tipo === 'sondeo' ? 'sondeo' : `${porcentaje(s.escrutado)} escrutado`}
                  </span>
                </p>
                {confirmando !== s.id && (
                  <div className="flex shrink-0 gap-2">
                    <Boton onClick={() => onEditar(s)} disabled={editandoId === s.id}>
                      Editar
                    </Boton>
                    <Boton variante="peligro" onClick={() => setConfirmando(s.id)} aria-label={`Borrar el dato de las ${hora(s.momento)}`}>
                      Borrar
                    </Boton>
                  </div>
                )}
              </div>
              <p className="mt-1.5 font-mono text-[12px] leading-5 text-secundario">
                {BLOQUES.map((b) => `${b.corto} ${s.escanos[b.id]}`).join(' · ')} · {porcentaje(s.participacion)}
              </p>
              {(s.nota || s.editadoEn) && (
                <p className="mt-0.5 text-[12px] text-secundario">
                  {s.nota && <span className="italic">{s.nota}</span>}
                  {s.nota && s.editadoEn && ' · '}
                  {s.editadoEn && <MarcaCorregido iso={s.editadoEn} />}
                </p>
              )}
              {confirmando === s.id && (
                <div role="group" aria-label="Confirmar borrado" className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-error/40 px-3 py-2">
                  <span className="text-[13px]">¿Borrar el dato de las {hora(s.momento)}? No se puede deshacer.</span>
                  <span className="flex gap-2">
                    <Boton variante="texto" onClick={() => setConfirmando(null)}>
                      Cancelar
                    </Boton>
                    <Boton variante="peligro" onClick={() => borrar(s)} disabled={borrando === s.id}>
                      {borrando === s.id ? 'Borrando…' : 'Sí, borrar'}
                    </Boton>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
