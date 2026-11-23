import { useState } from 'react';
import { Acceso } from '../components/admin/Acceso';
import { Formulario } from '../components/admin/Formulario';
import { Franjas } from '../components/admin/Franjas';
import { ListaSnapshots } from '../components/admin/ListaSnapshots';
import { Mantenimiento } from '../components/admin/Mantenimiento';
import { MiSituacion } from '../components/admin/MiSituacion';
import { Boton } from '../components/ui';
import { ELECCION } from '../config/eleccion';
import * as api from '../lib/api';
import { generarDatosPrueba } from '../lib/datosPrueba';
import type { MomentoHistorial } from '../lib/scoring';
import type { EntradaSnapshot, Porra, Snapshot } from '../types';

type Datos = {
  porras: readonly Porra[];
  snapshots: Snapshot[];
  historial: MomentoHistorial[];
  recargar: () => Promise<void>;
};

type Props = Datos & {
  token: string | null;
  aviso: string | null;
  onIniciarSesion: (token: string) => void;
  onCerrarSesion: () => void;
  onSesionCaducada: (mensaje: string) => void;
};

/**
 * Ruta /admin: sin sesión, el formulario de "Iniciar sesión"; con sesión, la pestaña "Panel"
 * para meter los resultados. Solo gestiona resultados: las apuestas son fijas y viven en el código.
 */
export function Admin({ token, aviso, onIniciarSesion, onCerrarSesion, onSesionCaducada, ...datos }: Props) {
  if (!token) return <Acceso aviso={aviso} onEntrar={onIniciarSesion} />;
  return <Panel {...datos} token={token} onCerrarSesion={onCerrarSesion} onSesionCaducada={onSesionCaducada} />;
}

function Panel({
  porras,
  snapshots,
  historial,
  recargar,
  token,
  onCerrarSesion,
  onSesionCaducada,
}: Datos & { token: string; onCerrarSesion: () => void; onSesionCaducada: (mensaje: string) => void }) {
  const [editando, setEditando] = useState<Snapshot | null>(null);
  const [peticionHora, setPeticionHora] = useState<{ iso: string; n: number } | null>(null);
  const yo = porras.find((p) => p.id === ELECCION.adminId);

  /** Ejecuta una escritura; si la contraseña deja de valer, vuelve a pedirla. Siempre refresca los datos. */
  async function escribir<T>(accion: () => Promise<T>): Promise<T> {
    try {
      return await accion();
    } catch (e) {
      if (e instanceof api.ErrorApi && e.status === 401) onSesionCaducada('La contraseña ya no es válida: vuelve a iniciar sesión.');
      throw e;
    } finally {
      await recargar();
    }
  }

  const guardar = (entrada: EntradaSnapshot, id?: string) =>
    escribir(() => (id ? api.editarSnapshot(token, id, entrada) : api.crearSnapshot(token, entrada)));

  const borrar = async (s: Snapshot) => {
    await escribir(() => api.borrarSnapshot(token, s.id));
    if (editando?.id === s.id) setEditando(null);
  };

  const borrarTodo = async () => {
    await escribir(() => api.borrarTodos(token));
    setEditando(null);
  };

  const cargarPrueba = async (progreso: (hechos: number, total: number) => void) => {
    const datos = generarDatosPrueba(porras);
    await escribir(async () => {
      await api.borrarTodos(token);
      for (let i = 0; i < datos.length; i++) {
        progreso(i + 1, datos.length);
        await api.crearSnapshot(token, datos[i]);
      }
    });
    setEditando(null);
  };

  return (
    <div className="pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[24px] font-semibold">Hola, {yo?.nombre ?? 'administrador'}</h1>
        <Boton variante="texto" onClick={onCerrarSesion}>
          Cerrar sesión
        </Boton>
      </div>

      <MiSituacion momento={historial[historial.length - 1]} adminId={ELECCION.adminId} />

      <Franjas snapshots={snapshots} onElegir={(iso) => setPeticionHora((p) => ({ iso, n: (p?.n ?? 0) + 1 }))} />

      <Formulario
        porras={porras}
        snapshots={snapshots}
        editando={editando}
        peticionHora={peticionHora}
        onGuardar={guardar}
        onEditar={setEditando}
        onCancelarEdicion={() => setEditando(null)}
      />

      <ListaSnapshots snapshots={snapshots} editandoId={editando?.id ?? null} onEditar={setEditando} onBorrar={borrar} />

      <Mantenimiento total={snapshots.length} onBorrarTodo={borrarTodo} onCargarPrueba={cargarPrueba} />

      <p className="mt-8 text-[12px] text-secundario">
        Las apuestas no se pueden ver ni editar desde aquí: son fijas y viven en el código (src/data/porras.ts).
      </p>
    </div>
  );
}
