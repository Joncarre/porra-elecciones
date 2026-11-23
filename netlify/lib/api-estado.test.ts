import { describe, expect, it } from 'vitest';
import { almacenEstadoMemoria } from './almacen';
import { manejarEstado } from './api-estado';

const TOKEN = 'secreto';
const entorno = { adminToken: TOKEN, ahora: () => new Date('2026-11-29T19:02:00Z') };
const peticion = (metodo: string, cuerpo?: unknown, token: string | null = TOKEN) =>
  new Request('http://localhost/api/estado', {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

describe('/api/estado', () => {
  it('GET es público y sin caché', async () => {
    const r = await manejarEstado(peticion('GET', undefined, null), almacenEstadoMemoria(), entorno);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(await r.json()).toEqual({ iniciadoEn: null, cerradoEn: null });
  });

  it('iniciar y cerrar requieren la contraseña', async () => {
    const a = almacenEstadoMemoria();
    expect((await manejarEstado(peticion('POST', { accion: 'iniciar' }, null), a, entorno)).status).toBe(401);
    expect((await manejarEstado(peticion('POST', { accion: 'iniciar' }, 'mal'), a, entorno)).status).toBe(401);
    expect(a.actual()).toEqual({ iniciadoEn: null, cerradoEn: null });
  });

  it('iniciar, cerrar y reabrir', async () => {
    const a = almacenEstadoMemoria();
    await manejarEstado(peticion('POST', { accion: 'iniciar' }), a, entorno);
    expect(a.actual().iniciadoEn).toBe('2026-11-29T19:02:00.000Z');
    const r = await manejarEstado(peticion('POST', { accion: 'cerrar' }), a, entorno);
    expect((await r.json()).cerradoEn).toBe('2026-11-29T19:02:00.000Z');
    await manejarEstado(peticion('POST', { accion: 'reabrir' }), a, entorno);
    expect(a.actual().cerradoEn).toBeNull();
  });

  it('acción desconocida → 400 con mensaje claro', async () => {
    const r = await manejarEstado(peticion('POST', { accion: 'terminar' }), almacenEstadoMemoria(), entorno);
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/iniciar/);
  });
});
