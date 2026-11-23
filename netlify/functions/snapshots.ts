import type { Config, Context } from '@netlify/functions';
import { almacenBlobs } from '../lib/almacen';
import { manejarSnapshots } from '../lib/api-snapshots';

export default async (req: Request, context: Context) =>
  manejarSnapshots(req, context.params?.id, almacenBlobs(), {
    adminToken: process.env.ADMIN_TOKEN,
    ahora: () => new Date(),
    nuevoId: () => crypto.randomUUID(),
  });

export const config: Config = {
  path: ['/api/snapshots', '/api/snapshots/:id'],
};
