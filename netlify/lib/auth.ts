import { createHash, timingSafeEqual } from 'node:crypto';
import { respuestaError } from './respuestas';

const resumen = (texto: string) => createHash('sha256').update(texto, 'utf8').digest();

/**
 * Comprueba la cabecera `Authorization: Bearer <ADMIN_TOKEN>`.
 * Devuelve null si es correcta, o la respuesta de error que hay que enviar.
 */
export function comprobarAcceso(req: Request, adminToken: string | undefined): Response | null {
  if (!adminToken) {
    return respuestaError(500, 'Falta configurar la variable de entorno ADMIN_TOKEN en Netlify.');
  }
  const cabecera = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(cabecera.trim());
  if (!m) return respuestaError(401, 'Necesitas la contraseña de administrador.');
  // Comparación en tiempo constante (sobre resúmenes de igual longitud).
  if (!timingSafeEqual(resumen(m[1]), resumen(adminToken))) {
    return respuestaError(401, 'Contraseña de administrador incorrecta.');
  }
  return null;
}
