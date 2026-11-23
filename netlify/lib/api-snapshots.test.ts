import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../../src/types';
import { almacenMemoria, type Almacen } from './almacen';
import { manejarSesion, manejarSnapshots, type Entorno } from './api-snapshots';

const TOKEN = 'secreto-de-prueba';
let n = 0;
const entorno: Entorno = {
  adminToken: TOKEN,
  ahora: () => new Date('2026-11-29T21:14:00Z'),
  nuevoId: () => `id-${++n}`,
};

const cuerpo = {
  momento: '2026-11-29T21:00:00.000Z',
  escrutado: 41,
  escanos: { pp: 130, psoe: 110, vox: 60, fa: 20 },
  participacion: 70.2,
  tipo: 'escrutinio',
};

function peticion(metodo: string, datos?: unknown, token: string | null = TOKEN) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('http://localhost/api/snapshots', {
    method: metodo,
    headers,
    body: datos === undefined ? undefined : typeof datos === 'string' ? datos : JSON.stringify(datos),
  });
}

const llamar = (almacen: Almacen, metodo: string, datos?: unknown, id?: string, token?: string | null) =>
  manejarSnapshots(peticion(metodo, datos, token === undefined ? TOKEN : token), id, almacen, entorno);

describe('GET /api/snapshots', () => {
  it('devuelve la lista vacía, sin caché', async () => {
    const r = await llamar(almacenMemoria(), 'GET', undefined, undefined, null);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(await r.json()).toEqual([]);
  });
});

describe('escrituras protegidas', () => {
  it('sin token o con token incorrecto → 401', async () => {
    const a = almacenMemoria();
    expect((await llamar(a, 'POST', cuerpo, undefined, null)).status).toBe(401);
    const r = await llamar(a, 'POST', cuerpo, undefined, 'otro');
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe('Contraseña de administrador incorrecta.');
    expect((await llamar(a, 'DELETE', undefined, undefined, null)).status).toBe(401);
  });

  it('sin ADMIN_TOKEN configurado → 500 con mensaje claro', async () => {
    const r = await manejarSnapshots(peticion('POST', cuerpo), undefined, almacenMemoria(), { ...entorno, adminToken: undefined });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toMatch(/ADMIN_TOKEN/);
  });

  it('/api/sesion valida la contraseña', () => {
    expect(manejarSesion(peticion('GET'), TOKEN).status).toBe(204);
    expect(manejarSesion(peticion('GET', undefined, 'mal'), TOKEN).status).toBe(401);
  });
});

describe('POST /api/snapshots', () => {
  it('crea un snapshot calculando Otros', async () => {
    const a = almacenMemoria();
    const r = await llamar(a, 'POST', cuerpo);
    expect(r.status).toBe(201);
    const s: Snapshot = await r.json();
    expect(s.escanos).toEqual({ pp: 130, psoe: 110, vox: 60, fa: 20, otros: 30 });
    expect(s.creadoEn).toBe('2026-11-29T21:14:00.000Z');
    expect(a.datos()).toHaveLength(1);
  });

  it('ignora un "otros" enviado por el cliente', async () => {
    const r = await llamar(almacenMemoria(), 'POST', { ...cuerpo, escanos: { ...cuerpo.escanos, otros: 999 } });
    expect((await r.json()).escanos.otros).toBe(30);
  });

  it('400 con mensaje en español si los datos no cuadran', async () => {
    const a = almacenMemoria();
    const r = await llamar(a, 'POST', { ...cuerpo, escanos: { pp: 200, psoe: 100, vox: 40, fa: 20 } });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe('PP, PSOE, Vox y FA suman 360 escaños: no pueden pasar de 350.');
    expect((await llamar(a, 'POST', '{no es json')).status).toBe(400);
    expect(a.datos()).toHaveLength(0);
  });

  it('no permite dos datos a la misma hora', async () => {
    const a = almacenMemoria();
    await llamar(a, 'POST', cuerpo);
    const r = await llamar(a, 'POST', cuerpo);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe('Ya hay un dato para las 22:00. Corrígelo en lugar de crear otro.');
  });

  it('mantiene la lista ordenada por momento', async () => {
    const a = almacenMemoria();
    await llamar(a, 'POST', { ...cuerpo, momento: '2026-11-29T22:00:00.000Z' });
    await llamar(a, 'POST', { ...cuerpo, momento: '2026-11-29T20:00:00.000Z' });
    expect(a.datos().map((s) => s.momento)).toEqual(['2026-11-29T20:00:00.000Z', '2026-11-29T22:00:00.000Z']);
  });
});

describe('PUT y DELETE', () => {
  it('PUT corrige y rellena editadoEn', async () => {
    const a = almacenMemoria();
    const creado: Snapshot = await (await llamar(a, 'POST', cuerpo)).json();
    const r = await llamar(a, 'PUT', { ...cuerpo, escrutado: 45 }, creado.id);
    expect(r.status).toBe(200);
    const e: Snapshot = await r.json();
    expect(e.escrutado).toBe(45);
    expect(e.editadoEn).toBe('2026-11-29T21:14:00.000Z');
    expect(e.creadoEn).toBe(creado.creadoEn);
  });

  it('PUT de un id inexistente → 404', async () => {
    expect((await llamar(almacenMemoria(), 'PUT', cuerpo, 'nada')).status).toBe(404);
  });

  it('DELETE de uno y DELETE de todos', async () => {
    const a = almacenMemoria();
    const s1: Snapshot = await (await llamar(a, 'POST', cuerpo)).json();
    await llamar(a, 'POST', { ...cuerpo, momento: '2026-11-29T22:00:00.000Z' });
    expect((await llamar(a, 'DELETE', undefined, s1.id)).status).toBe(204);
    expect(a.datos()).toHaveLength(1);
    expect((await llamar(a, 'DELETE', undefined, s1.id)).status).toBe(404);
    expect((await llamar(a, 'DELETE')).status).toBe(204);
    expect(a.datos()).toHaveLength(0);
  });
});

describe('concurrencia', () => {
  it('reintenta si otra escritura se cruza', async () => {
    const base = almacenMemoria();
    let cruzar = true;
    const conCruce: Almacen = {
      leer: () => base.leer(),
      async escribir(lista, version) {
        if (cruzar) {
          cruzar = false;
          // Otra escritura llega justo antes: cambia la versión.
          await base.escribir((await base.leer()).snapshots, version);
        }
        return base.escribir(lista, version);
      },
    };
    const r = await llamar(conCruce, 'POST', cuerpo);
    expect(r.status).toBe(201);
    expect(base.datos()).toHaveLength(1);
  });
});
