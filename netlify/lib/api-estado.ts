/**
 * Lógica HTTP de /api/estado:
 *
 *   GET  /api/estado                         → { iniciadoEn, cerradoEn } (Cache-Control: no-store)
 *   POST /api/estado  { "accion": "iniciar" | "cerrar" | "reabrir" | "reiniciar" }   (admin)
 */
import { aplicarAccion, esAccion } from '../../src/lib/estado';
import type { AlmacenEstado } from './almacen';
import { comprobarAcceso } from './auth';
import { respuestaError, respuestaJson } from './respuestas';

export async function manejarEstado(
  req: Request,
  almacen: AlmacenEstado,
  entorno: { adminToken: string | undefined; ahora: () => Date },
): Promise<Response> {
  try {
    const metodo = req.method.toUpperCase();
    if (metodo === 'GET') return respuestaJson(await almacen.leer());
    if (metodo !== 'POST') return respuestaError(405, 'Método no permitido.');

    const denegado = comprobarAcceso(req, entorno.adminToken);
    if (denegado) return denegado;

    let cuerpo: unknown;
    try {
      cuerpo = await req.json();
    } catch {
      return respuestaError(400, 'El cuerpo de la petición no es JSON válido.');
    }
    const accion = (cuerpo as { accion?: unknown } | null)?.accion;
    if (!esAccion(accion)) {
      return respuestaError(400, 'La acción debe ser «iniciar», «cerrar», «reabrir» o «reiniciar».');
    }
    const nuevo = aplicarAccion(await almacen.leer(), accion, entorno.ahora());
    await almacen.escribir(nuevo);
    return respuestaJson(nuevo);
  } catch (e) {
    console.error(e);
    return respuestaError(500, 'Error inesperado en el servidor.');
  }
}
