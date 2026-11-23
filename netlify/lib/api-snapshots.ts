/**
 * Lógica HTTP de /api/snapshots, independiente de Netlify para poder probarla.
 *
 *   GET    /api/snapshots       → lista completa (Cache-Control: no-store)
 *   POST   /api/snapshots       → crea uno                 (admin)
 *   PUT    /api/snapshots/:id   → corrige uno (editadoEn)  (admin)
 *   DELETE /api/snapshots/:id   → borra uno                (admin)
 *   DELETE /api/snapshots       → borra todos              (admin)
 *
 * No existe ningún endpoint para modificar apuestas: viven en el código.
 */
import { crearSnapshot, editarSnapshot, snapshotEnMomento, validarEntrada } from '../../src/lib/snapshots';
import type { EntradaSnapshot, Snapshot } from '../../src/types';
import type { Almacen } from './almacen';
import { comprobarAcceso } from './auth';
import { respuestaError, respuestaJson, respuestaVacia } from './respuestas';

export type Entorno = {
  adminToken: string | undefined;
  ahora: () => Date;
  nuevoId: () => string;
};

const REINTENTOS = 4;

class ErrorHttp extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Lectura-modificación-escritura con concurrencia optimista: si otra escritura se cruza, se reintenta. */
async function modificar<T>(almacen: Almacen, cambio: (actuales: Snapshot[]) => { lista: Snapshot[]; resultado: T }) {
  for (let intento = 0; intento < REINTENTOS; intento++) {
    const { snapshots, version } = await almacen.leer();
    const { lista, resultado } = cambio(snapshots);
    if (await almacen.escribir(lista, version)) return resultado;
  }
  throw new ErrorHttp(409, 'Otra escritura se ha cruzado con esta. Vuelve a intentarlo.');
}

async function leerEntrada(req: Request, ahora: Date): Promise<EntradaSnapshot> {
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    throw new ErrorHttp(400, 'El cuerpo de la petición no es JSON válido.');
  }
  const v = validarEntrada(cuerpo, ahora);
  if (!v.ok) throw new ErrorHttp(400, v.error);
  return v.valor;
}

const horaMadrid = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function comprobarHoraLibre(lista: Snapshot[], momento: string, excluirId?: string) {
  const existente = snapshotEnMomento(lista, momento, excluirId);
  if (existente) {
    throw new ErrorHttp(409, `Ya hay un dato para las ${horaMadrid(momento)}. Corrígelo en lugar de crear otro.`);
  }
}

export async function manejarSnapshots(
  req: Request,
  id: string | undefined,
  almacen: Almacen,
  entorno: Entorno,
): Promise<Response> {
  try {
    const metodo = req.method.toUpperCase();

    if (metodo === 'GET') {
      const { snapshots } = await almacen.leer();
      if (!id) return respuestaJson(snapshots);
      const uno = snapshots.find((s) => s.id === id);
      return uno ? respuestaJson(uno) : respuestaError(404, 'No existe ese dato.');
    }

    if (!['POST', 'PUT', 'DELETE'].includes(metodo)) {
      return respuestaError(405, 'Método no permitido.');
    }

    const denegado = comprobarAcceso(req, entorno.adminToken);
    if (denegado) return denegado;

    if (metodo === 'POST' && !id) {
      const ahora = entorno.ahora();
      const entrada = await leerEntrada(req, ahora);
      const creado = await modificar(almacen, (lista) => {
        comprobarHoraLibre(lista, entrada.momento);
        const nuevo = crearSnapshot(entrada, { id: entorno.nuevoId(), ahora });
        return { lista: [...lista, nuevo], resultado: nuevo };
      });
      return respuestaJson(creado, 201);
    }

    if (metodo === 'PUT' && id) {
      const ahora = entorno.ahora();
      const entrada = await leerEntrada(req, ahora);
      const editado = await modificar(almacen, (lista) => {
        const previo = lista.find((s) => s.id === id);
        if (!previo) throw new ErrorHttp(404, 'No existe ese dato: quizá se borró.');
        comprobarHoraLibre(lista, entrada.momento, id);
        const nuevo = editarSnapshot(previo, entrada, ahora);
        return { lista: lista.map((s) => (s.id === id ? nuevo : s)), resultado: nuevo };
      });
      return respuestaJson(editado);
    }

    if (metodo === 'DELETE' && id) {
      await modificar(almacen, (lista) => {
        if (!lista.some((s) => s.id === id)) throw new ErrorHttp(404, 'No existe ese dato: quizá ya se borró.');
        return { lista: lista.filter((s) => s.id !== id), resultado: null };
      });
      return respuestaVacia();
    }

    if (metodo === 'DELETE' && !id) {
      await modificar(almacen, () => ({ lista: [], resultado: null }));
      return respuestaVacia();
    }

    return respuestaError(405, 'Método no permitido en esta ruta.');
  } catch (e) {
    if (e instanceof ErrorHttp) return respuestaError(e.status, e.message);
    console.error(e);
    return respuestaError(500, 'Error inesperado en el servidor.');
  }
}

/** GET /api/sesion: comprueba la contraseña del panel sin tocar datos. */
export function manejarSesion(req: Request, adminToken: string | undefined): Response {
  return comprobarAcceso(req, adminToken) ?? respuestaVacia();
}
