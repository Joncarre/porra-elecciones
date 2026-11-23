import type { Config } from '@netlify/functions';
import { almacenEstadoBlobs } from '../lib/almacen';
import { manejarEstado } from '../lib/api-estado';

/** Estado del escrutinio: lo leen todos; solo el administrador lo inicia o lo cierra. */
export default async (req: Request) =>
  manejarEstado(req, almacenEstadoBlobs(), { adminToken: process.env.ADMIN_TOKEN, ahora: () => new Date() });

export const config: Config = {
  path: '/api/estado',
};
