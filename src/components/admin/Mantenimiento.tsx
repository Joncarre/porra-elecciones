import { useState } from 'react';
import { ErrorApi } from '../../lib/api';
import { Boton, claseInput } from '../ui';

type Props = {
  total: number;
  onBorrarTodo: () => Promise<void>;
  onCargarPrueba: (progreso: (hechos: number, total: number) => void) => Promise<void>;
};

/** Ensayo y limpieza: datos de prueba y "Borrar todo" (con confirmación escribiendo BORRAR). */
export function Mantenimiento({ total, onBorrarTodo, onCargarPrueba }: Props) {
  const [paso, setPaso] = useState<'reposo' | 'prueba' | 'borrar'>('reposo');
  const [confirmacion, setConfirmacion] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  async function ejecutar(accion: () => Promise<void>, ok: string) {
    setMensaje(null);
    try {
      await accion();
      setMensaje({ tipo: 'ok', texto: ok });
      setPaso('reposo');
      setConfirmacion('');
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof ErrorApi ? e.message : 'Algo ha fallado.' });
    } finally {
      setOcupado(null);
    }
  }

  const cargarPrueba = () =>
    ejecutar(async () => {
      setOcupado('Preparando…');
      await onCargarPrueba((hechos, de) => setOcupado(`Cargando ${hechos}/${de}…`));
    }, 'Datos de prueba cargados: sondeo de las 20:00 y escrutinio de 21:00 a 00:00 (100 %).');

  const borrarTodo = () =>
    ejecutar(async () => {
      setOcupado('Borrando…');
      await onBorrarTodo();
    }, 'Todos los datos borrados.');

  return (
    <section aria-labelledby="ensayo-titulo" className="mt-12 rounded-[12px] border border-borde px-4 py-4">
      <h2 id="ensayo-titulo" className="font-display text-[17px] font-semibold">
        Ensayo y limpieza
      </h2>
      <p className="mt-1 text-[13px] text-secundario">
        Antes de la noche electoral: carga datos de prueba, revisa la web y después bórralo todo.
      </p>

      {paso === 'reposo' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Boton onClick={() => (total > 0 ? setPaso('prueba') : cargarPrueba())} disabled={!!ocupado}>
            {ocupado ?? 'Cargar datos de prueba'}
          </Boton>
          <Boton variante="peligro" onClick={() => setPaso('borrar')} disabled={total === 0 || !!ocupado}>
            Borrar todo
          </Boton>
        </div>
      )}

      {paso === 'prueba' && (
        <div role="group" aria-label="Confirmar datos de prueba" className="mt-4 space-y-3">
          <p className="text-[14px]">
            Se borrarán los {total} {total === 1 ? 'dato actual' : 'datos actuales'} y se cargarán 5 de prueba.
          </p>
          <div className="flex gap-2">
            <Boton onClick={cargarPrueba} disabled={!!ocupado}>
              {ocupado ?? 'Sí, cargar datos de prueba'}
            </Boton>
            <Boton variante="texto" onClick={() => setPaso('reposo')} disabled={!!ocupado}>
              Cancelar
            </Boton>
          </div>
        </div>
      )}

      {paso === 'borrar' && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (confirmacion === 'BORRAR') borrarTodo();
          }}
        >
          <label htmlFor="confirmar-borrar" className="block text-[14px]">
            Se borrarán los {total} datos. Para confirmar, escribe <span className="font-mono font-bold">BORRAR</span>.
          </label>
          <input
            id="confirmar-borrar"
            autoComplete="off"
            autoCapitalize="characters"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            className={`${claseInput} max-w-xs font-mono text-[16px]`}
          />
          <div className="flex gap-2">
            <Boton type="submit" variante="peligro" disabled={confirmacion !== 'BORRAR' || !!ocupado}>
              {ocupado ?? 'Borrar todo'}
            </Boton>
            <Boton
              variante="texto"
              onClick={() => {
                setPaso('reposo');
                setConfirmacion('');
              }}
            >
              Cancelar
            </Boton>
          </div>
        </form>
      )}

      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={`mt-3 text-[13px] ${mensaje.tipo === 'error' ? 'text-error' : 'text-texto'}`}>
          {mensaje.tipo === 'ok' && '✓ '}
          {mensaje.texto}
        </p>
      )}
    </section>
  );
}
