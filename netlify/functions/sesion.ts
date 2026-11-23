import type { Config } from '@netlify/functions';
import { manejarSesion } from '../lib/api-snapshots';

/** Comprueba la contraseña del panel de administración (204 si es correcta, 401 si no). */
export default async (req: Request) => manejarSesion(req, process.env.ADMIN_TOKEN);

export const config: Config = {
  path: '/api/sesion',
  method: 'GET',
};
