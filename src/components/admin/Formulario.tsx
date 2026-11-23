import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { BLOQUES_PARTIDO, ELECCION } from '../../config/eleccion';
import { ErrorApi } from '../../lib/api';
import { borradorDesde, borradorNuevo, entradaDesde, otrosEnVivo, type Borrador } from '../../lib/borrador';
import { decimalesComunes, hora, porcentaje, puntos } from '../../lib/formato';
import { estadoFranjas, horaPorDefecto } from '../../lib/panel';
import { calcularHistorial } from '../../lib/scoring';
import { crearSnapshot, ordenarSnapshots, snapshotEnMomento } from '../../lib/snapshots';
import { franjas } from '../../lib/tiempo';
import type { EntradaSnapshot, Porra, Snapshot } from '../../types';
import { CambioPuesto } from '../CambioPuesto';
import { Boton, claseEtiqueta, claseInput } from '../ui';

type Props = {
  porras: readonly Porra[];
  snapshots: readonly Snapshot[];
  /** Dato que se está corrigiendo (null = dato nuevo). */
  editando: Snapshot | null;
  onGuardar: (entrada: EntradaSnapshot, idEditado?: string) => Promise<Snapshot>;
  onEditar: (s: Snapshot) => void;
  onCancelarEdicion: () => void;
};

const NOMBRES_CAMPO = { pp: 'pp', psoe: 'psoe', vox: 'vox', fa: 'fa' } as const;
const mismoMinuto = (a: string, b: string) => Math.floor(Date.parse(a) / 60_000) === Math.floor(Date.parse(b) / 60_000);

export function Formulario({ porras, snapshots, editando, onGuardar, onEditar, onCancelarEdicion }: Props) {
  const ordenados = useMemo(() => ordenarSnapshots(snapshots), [snapshots]);
  const ultimo = ordenados[ordenados.length - 1];

  const nuevo = (): Borrador => borradorNuevo(ultimo, horaPorDefecto(snapshots));

  const [borrador, setBorrador] = useState<Borrador>(nuevo);
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Mientras no se toque, el formulario se precarga con el último dato y la siguiente hora.
  const claveUltimo = ultimo ? `${ultimo.id}|${ultimo.editadoEn ?? ''}|${snapshots.length}` : 'vacio';
  useEffect(() => {
    if (!editando && !tocado) setBorrador(nuevo());
  }, [claveUltimo, editando, tocado]);

  useEffect(() => {
    if (editando) {
      setBorrador(borradorDesde(editando));
      setTocado(false);
      setErrorServidor(null);
      setExito(null);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editando]);

  const cambiar = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => {
    setBorrador((b) => ({ ...b, [campo]: valor }));
    setTocado(true);
    setErrorServidor(null);
    setExito(null);
  };

  const validacion = entradaDesde(borrador);
  const otros = otrosEnVivo(borrador);
  const entrada = validacion.ok ? validacion.valor : null;
  const duplicado = entrada ? snapshotEnMomento(snapshots, entrada.momento, editando?.id) : undefined;

  // Horas de la noche (y la del dato que se corrige, si no fuera una de ellas).
  const horas = estadoFranjas(franjas(), snapshots);
  const horaFuera = borrador.momento && !horas.some((h) => mismoMinuto(h.iso, borrador.momento)) ? borrador.momento : null;

  // Vista previa: la clasificación tal y como quedaría con este dato.
  const previa = useMemo(() => {
    if (!entrada || duplicado) return null;
    const candidato = crearSnapshot(entrada, { id: editando?.id ?? '__previa__', ahora: new Date() });
    const lista = editando ? snapshots.map((s) => (s.id === editando.id ? { ...candidato, creadoEn: s.creadoEn } : s)) : [...snapshots, candidato];
    return calcularHistorial(porras, lista).find((m) => m.snapshot.id === candidato.id) ?? null;
  }, [entrada, duplicado, editando, snapshots, porras]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!entrada || duplicado || guardando) return;
    setGuardando(true);
    setErrorServidor(null);
    try {
      const s = await onGuardar(entrada, editando?.id);
      setExito(`${editando ? 'Corregido' : 'Guardado'}: ${hora(s.momento)} · ${porcentaje(s.escrutado)} escrutado.`);
      setTocado(false);
      if (editando) onCancelarEdicion();
    } catch (err) {
      setErrorServidor(err instanceof ErrorApi ? err.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  const errorVisible = tocado || editando ? (validacion.ok ? null : validacion.error) : null;
  const seleccionar = (e: { currentTarget: HTMLInputElement }) => e.currentTarget.select();

  return (
    <section aria-labelledby="form-titulo" className="mt-8 scroll-mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="form-titulo" className="font-display text-[19px] font-semibold">
          {editando ? `Corregir el dato de las ${hora(editando.momento)}` : 'Nuevo dato'}
        </h2>
        {editando && (
          <Boton variante="texto" onClick={onCancelarEdicion}>
            Cancelar
          </Boton>
        )}
      </div>
      {!editando && ultimo && (
        <p className="mt-1 text-[13px] text-secundario">Precargado con el dato de las {hora(ultimo.momento)}: cambia solo lo que se mueva.</p>
      )}

      <form ref={formRef} onSubmit={guardar} noValidate className="mt-4 space-y-4">
        <fieldset>
          <legend className={claseEtiqueta}>Hora del dato</legend>
          <div className="flex flex-wrap gap-2">
            {horaFuera && (
              <BotonHora etiqueta={hora(horaFuera)} elegida hecha={false} siguiente={false} onElegir={() => undefined} />
            )}
            {horas.map((h) => (
              <BotonHora
                key={h.iso}
                etiqueta={h.etiqueta}
                elegida={mismoMinuto(h.iso, borrador.momento)}
                hecha={h.hecha}
                siguiente={h.siguiente}
                onElegir={() => cambiar('momento', h.iso)}
              />
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="f-escrutado" className={claseEtiqueta}>
              % escrutado
            </label>
            <input
              id="f-escrutado"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="next"
              placeholder="0–100"
              value={borrador.escrutado}
              onFocus={seleccionar}
              onChange={(e) => cambiar('escrutado', e.target.value)}
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="f-participacion" className={claseEtiqueta}>
              Participación %
            </label>
            <input
              id="f-participacion"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="next"
              placeholder="70,5"
              value={borrador.participacion}
              onFocus={seleccionar}
              onChange={(e) => cambiar('participacion', e.target.value)}
              className={claseInput}
            />
          </div>
        </div>

        <fieldset>
          <legend className="sr-only">Escaños</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {BLOQUES_PARTIDO.map((b) => {
              const campo = NOMBRES_CAMPO[b.id as keyof typeof NOMBRES_CAMPO];
              return (
                <div key={b.id}>
                  <label htmlFor={`f-${b.id}`} className={claseEtiqueta}>
                    <span aria-hidden className="size-2 rounded-full" style={{ background: b.color }} />
                    {b.corto}
                  </label>
                  <input
                    id={`f-${b.id}`}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    enterKeyHint="next"
                    value={borrador[campo]}
                    onFocus={seleccionar}
                    onChange={(e) => cambiar(campo, e.target.value)}
                    className={claseInput}
                  />
                </div>
              );
            })}
          </div>
          <p
            className={`mt-3 flex items-baseline justify-between rounded-[10px] border px-3 py-2.5 text-[14px] ${
              otros < 0 ? 'border-error/50 text-error' : 'border-borde text-secundario'
            }`}
            aria-live="polite"
          >
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full" style={{ background: 'var(--color-otros)' }} />
              Otros (se calcula solo)
            </span>
            <span className="font-display text-[19px] font-semibold text-texto">
              {Number.isNaN(otros) ? '—' : otros}
              {otros < 0 && <span className="ml-2 text-[13px] font-normal text-error">pasan de {ELECCION.totalEscanos}</span>}
            </span>
          </p>
        </fieldset>

        {duplicado && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-error/40 px-3 py-2.5 text-[14px]">
            <span className="text-error">Ya hay un dato a las {hora(duplicado.momento)}.</span>
            <Boton onClick={() => onEditar(duplicado)}>Corregir ese dato</Boton>
          </div>
        )}
        {errorVisible && !duplicado && (
          <p role="alert" className="text-[14px] text-error">
            {errorVisible}
          </p>
        )}
        {errorServidor && (
          <p role="alert" className="text-[14px] text-error">
            {errorServidor}
          </p>
        )}

        {previa && (
          <div className="rounded-[12px] border border-borde bg-superficie px-3 py-3">
            <p className="etiqueta">Vista previa · así quedaría la clasificación</p>
            <ol className="mt-2 space-y-0.5">
              {previa.clasificacion.map((f) => {
                const cambio = previa.cambios[f.porra.id];
                const dec = decimalesComunes(previa.clasificacion.map((x) => x.desviacion.totalCent));
                return (
                  <li key={f.porra.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_2.5rem_4.5rem] items-baseline gap-x-2 text-[14px]">
                    <span className={`font-mono text-[12px] ${f.lider ? 'text-acento' : 'text-secundario'}`}>{f.posicion}</span>
                    <span className={`truncate ${f.lider ? 'text-acento' : f.porra.id === ELECCION.adminId ? 'text-texto' : 'text-secundario'}`}>
                      {f.porra.nombre}
                      {f.porra.id === ELECCION.adminId && <span className="ml-1.5 font-mono text-[10px] text-secundario uppercase">tú</span>}
                    </span>
                    <CambioPuesto cambio={cambio} />
                    <span className="text-right font-mono">{puntos(f.desviacion.totalCent, dec)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <Boton type="submit" variante="primario" disabled={!entrada || !!duplicado || guardando} className="w-full">
          {guardando
            ? 'Guardando…'
            : entrada
              ? `${editando ? 'Guardar corrección' : 'Guardar dato'} de las ${hora(entrada.momento)}`
              : editando
                ? 'Guardar corrección'
                : 'Guardar dato'}
        </Boton>
        {exito && (
          <p role="status" className="text-center text-[14px] text-texto">
            ✓ {exito}
          </p>
        )}
      </form>
    </section>
  );
}

/** Botón de hora: elegida (blanco), ya metida (✓) o la siguiente que toca. */
function BotonHora({
  etiqueta,
  elegida,
  hecha,
  siguiente,
  onElegir,
}: {
  etiqueta: string;
  elegida: boolean;
  hecha: boolean;
  siguiente: boolean;
  onElegir: () => void;
}) {
  const estado = hecha ? 'ya introducida' : siguiente ? 'la siguiente' : 'pendiente';
  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={elegida}
      aria-label={`${etiqueta}, ${estado}`}
      className={`flex h-11 min-w-[4.25rem] items-center justify-center gap-1 rounded-[10px] border px-3 font-mono text-[14px] transition-colors ${
        elegida
          ? 'border-texto bg-texto font-bold text-fondo'
          : hecha
            ? 'border-borde bg-superficie text-secundario hover:text-texto'
            : 'border-borde-fuerte text-texto hover:bg-superficie'
      }`}
    >
      {hecha && <span aria-hidden>✓</span>}
      {etiqueta}
    </button>
  );
}
