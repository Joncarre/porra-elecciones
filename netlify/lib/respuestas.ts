const CABECERAS = { 'Cache-Control': 'no-store' } as const;

export function respuestaJson(datos: unknown, status = 200): Response {
  return Response.json(datos, { status, headers: CABECERAS });
}

export function respuestaError(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: CABECERAS });
}

export function respuestaVacia(status = 204): Response {
  return new Response(null, { status, headers: CABECERAS });
}
