import { RUTAS, type Ruta } from '../hooks/useRuta';
import type { EstadoCarga } from '../hooks/useSnapshots';
import { hora, porcentaje } from '../lib/formato';
import { siguienteFranja } from '../lib/tiempo';
import type { Fase, Snapshot } from '../types';
import { Segmentado } from './Segmentado';
import { Boton } from './ui';

type Props = {
  ruta: Ruta;
  navegar: (destino: string) => void;
  /** Con la sesión de administrador iniciada aparece la pestaña "Panel". */
  conSesion: boolean;
  onIniciarSesion: () => void;
  ultimo: Snapshot | undefined;
  fase: Fase;
  estado: EstadoCarga;
  error: string | null;
};

/** Solo con la sesión de administrador iniciada hay pestañas; sin sesión, la web es una sola página. */
const PESTANAS: { valor: Ruta; etiqueta: string; href: string }[] = [
  { valor: 'directo', etiqueta: 'Directo', href: RUTAS.directo },
  { valor: 'admin', etiqueta: 'Panel', href: RUTAS.admin },
];

/**
 * Título a la izquierda, estado a la derecha y, en el centro, "Iniciar sesión"
 * (o las pestañas Directo · Panel con la sesión iniciada). En el móvil, el centro baja a una segunda fila.
 */
export function Cabecera({ ruta, navegar, conSesion, onIniciarSesion, ultimo, fase, estado, error }: Props) {
  const centro = 'col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1';
  return (
    <header className="mx-auto w-full max-w-[720px] px-4 pt-5 pb-2 sm:pt-7">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-4 sm:grid-cols-[1fr_auto_1fr]">
        <a
          href={RUTAS.directo}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey) return;
            e.preventDefault();
            navegar(RUTAS.directo);
          }}
          className="col-start-1 row-start-1 justify-self-start font-display text-[22px] leading-none font-semibold tracking-tight"
        >
          Porra 29N
        </a>
        {conSesion ? (
          <Segmentado
            id="pestanas"
            modo="nav"
            etiquetaAria="Secciones"
            opciones={PESTANAS}
            valor={ruta}
            onCambio={(v) => navegar(RUTAS[v])}
            className={`${centro} w-full sm:w-auto sm:justify-self-center`}
          />
        ) : (
          ruta !== 'admin' && (
            <Boton onClick={onIniciarSesion} className={`${centro} justify-self-center`}>
              Iniciar sesión
            </Boton>
          )
        )}
        <div className="col-start-2 row-start-1 justify-self-end text-right sm:col-start-3">
          <Estado ultimo={ultimo} fase={fase} estado={estado} error={error} />
        </div>
      </div>
    </header>
  );
}

function Punto({ tipo }: { tipo: 'directo' | 'final' | 'apagado' }) {
  const color = tipo === 'apagado' ? 'bg-secundario/50' : 'bg-acento';
  return <span aria-hidden className={`inline-block size-[7px] shrink-0 rounded-full ${color} ${tipo === 'directo' ? 'pulso' : ''}`} />;
}

function Estado({ ultimo, fase, estado, error }: Pick<Props, 'ultimo' | 'fase' | 'estado' | 'error'>) {
  let principal: string;
  let secundaria: string | null = null;
  let punto: 'directo' | 'final' | 'apagado' = 'apagado';

  if (estado === 'cargando') {
    principal = 'Conectando…';
  } else if (estado === 'error' && !ultimo) {
    principal = 'Sin conexión';
  } else if (fase === 'cerrada') {
    principal = 'Resultado final';
    punto = 'final';
  } else if (fase === 'espera') {
    principal = 'Esperando datos';
  } else if (!ultimo) {
    // Escrutinio iniciado, pero aún sin datos
    punto = 'directo';
    principal = 'Escrutinio en curso';
    const siguiente = siguienteFranja(new Date().toISOString());
    if (siguiente) secundaria = `Primer dato hacia las ${siguiente.etiqueta}`;
  } else {
    punto = 'directo';
    principal =
      ultimo.tipo === 'sondeo'
        ? `${hora(ultimo.momento)} · Sondeo`
        : `${hora(ultimo.momento)} · ${porcentaje(ultimo.escrutado)} escrutado`;
    const siguiente = siguienteFranja(ultimo.momento);
    if (siguiente && ultimo.escrutado < 100) secundaria = `Próximo hacia las ${siguiente.etiqueta}`;
  }
  if (error && ultimo) secundaria = 'Sin conexión · reintentando';

  return (
    <div role="status" aria-live="polite" className="font-mono text-[11px] leading-4 tracking-[0.06em] uppercase">
      <div className={`flex items-center justify-end gap-2 ${punto === 'apagado' ? 'text-secundario' : 'text-texto'}`}>
        <Punto tipo={punto} />
        <span>{principal}</span>
      </div>
      {secundaria && <div className="mt-0.5 text-secundario">{secundaria}</div>}
    </div>
  );
}
