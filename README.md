# Porra 29N

Web en directo para la porra de las elecciones generales del 29 de noviembre de 2026 (Congreso, 350 escaños).
Cada participante apostó los escaños de PP, PSOE, Vox, Frente Amplio y Otros, y la participación.
Gana quien menos se desvía.

- **Directo** (`/`), la única página para todos:
  - **Último resultado**: barra de 350 escaños con la mayoría absoluta, participación y % escrutado.
  - **Clasificación** («Resultado final» al llegar al 100 %): al tocar a alguien se abre su desglose
    (Tu apuesta · Resultado actual · Desviación).
  - **Evolución**: gráfica por posición o por desviación, una línea de color por participante con su nombre al final.
  - **Eventos importantes**: la noche contada hora a hora, lo más reciente arriba, con como mucho 3 eventos por hora. Recoge cambios de líder,
    quién se pone a menos de 1 punto, ventajas que crecen 5 puntos o más, recortes de 5 puntos o más, saltos de 3 o más
    puestos y, al final, la victoria, los escaños clavados y quién más se acercó en participación.
    Los umbrales están en `src/lib/eventos.ts`.
  - Antes del primer dato muestra las porras en orden alfabético, con sus cifras.
- **Panel**: pestaña que solo aparece al administrador. Con el botón **«Iniciar sesión»** (arriba, en el centro) y la contraseña
  `ADMIN_TOKEN`, el administrador ve exactamente lo mismo que todos y, además, la pestaña Panel para meter los
  resultados cada hora. «Cerrar sesión» la quita. La sesión dura mientras la pestaña del navegador siga abierta.

Hecho con Vite + React + TypeScript + Tailwind CSS v4, Recharts, motion, Netlify Functions y Netlify Blobs.
Sin base de datos externa ni cuentas adicionales.

---

## Reglas de puntuación

Para cada participante y cada resultado:

- Desviación por bloque = real − apuesta (con signo: + si el partido sacó más de lo apostado, − si sacó menos).
- Desviación en participación = real − apuesta, en puntos porcentuales.
- **Desviación total** = |PP| + |PSOE| + |Vox| + |FA| + |Otros| + |participación|. Un punto de participación pesa lo mismo que un escaño.
- Las desviaciones **no se compensan**: +4 en el PP y −4 en el PSOE son 8, no 0.
- Gana la menor desviación total. Los empates comparten posición (1, 1, 3…); si se llega así al final, hay varios ganadores.
- La participación que cuenta es la del Ministerio del Interior la noche electoral (sin CERA). El resultado final es el dato con el 100 % escrutado.

Todo se calcula en centésimas enteras (sin errores de coma flotante) en `src/lib/scoring.ts`.

---

## Arrancar en local

Requisitos: Node 20.19 o superior (recomendado 22) y la CLI de Netlify.

```bash
npm install
npm install -g netlify-cli      # o usa «npx netlify-cli dev» sin instalarla
cp .env.example .env            # y pon una contraseña en ADMIN_TOKEN
netlify dev
```

Abre <http://localhost:8888>. `netlify dev` arranca Vite y emula las Functions y Blobs en local (los datos
se guardan en la carpeta `.netlify/`, que no se sube al repositorio). No hace falta iniciar sesión en Netlify.

Para meter datos, pulsa «Iniciar sesión» (arriba, en el centro) y usa la contraseña que pusiste en `.env`.

Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm test` | Tests (Vitest): puntuación, validaciones, API, horas, formulario del panel… |
| `npm run validate` | Comprueba las porras (también se ejecuta solo antes de cada build). |
| `npm run build` | Valida las porras, comprueba tipos y genera `dist/`. |
| `npm run dev:vite` | Solo el front, sin API (verás «Sin conexión»). |

---

## Añadir las porras

Las apuestas son fijas y públicas: viven en **`src/data/porras.ts`** y no se pueden cambiar desde la web.

```ts
{ id: 'jonathan', nombre: 'Jonathan', escanos: { pp: 125, psoe: 110, vox: 70, fa: 10, otros: 35 }, participacion: 74 },
```

- `id`: único, en minúsculas, sin espacios ni tildes (`angel`, `jesus`).
- Los cinco bloques deben sumar **exactamente 350**.
- `participacion` en %, con hasta dos decimales (`73.4` = 73,4 %).
- Da igual cuántos participantes haya.

Antes de cada build, `scripts/validate-porras.ts` comprueba las sumas, que los escaños sean enteros ≥ 0, que la participación
esté entre 0 y 100, que no se repitan ids y que exista el administrador. Si algo falla, dice quién y cuánto suma, y **el build se detiene**:

```
✗ Hay 1 problema(s) en src/data/porras.ts:
  • Varo [varo]: suma 368 escaños (sobran 18 para 350).
```

## Configuración

`src/config/eleccion.ts`:

- `adminId`: el participante que administra (`'jonathan'`).
- `franjas`: horas previstas para meter datos (`21:00` … `01:00`). Las horas antes de las 12:00 cuentan como madrugada del día siguiente.
- `BLOQUES`: orden, nombres y color de cada bloque. Ningún componente tiene partidos escritos a mano.

Los colores (tema oscuro, acento y partidos) están como variables en `@theme`, en `src/index.css`.
Para el Frente Amplio, cambia `--color-fa` por su color de campaña.

---

## Desplegar en Netlify desde GitHub

1. Sube el repositorio a GitHub.
2. En Netlify: **Add new project → Import an existing project → GitHub** y elige el repositorio.
   La configuración de build sale de `netlify.toml` (`npm run build`, publica `dist`, Node 22). No hay que tocar nada.
3. Define la contraseña del panel (siguiente apartado) y vuelve a desplegar.
4. Comparte la URL del proyecto (`https://<nombre>.netlify.app`) con el grupo. La contraseña no la compartas:
   es lo único que protege el panel.

Netlify Blobs se activa solo: no hay que crear nada. Cada `git push` a `main` vuelve a desplegar, y los datos guardados se conservan.

### Definir `ADMIN_TOKEN`

1. En Netlify, abre el proyecto → **Project configuration → Environment variables** (en proyectos antiguos, *Site configuration*).
2. **Add a variable**: clave `ADMIN_TOKEN`, valor una frase larga y difícil de adivinar (p. ej. 5–6 palabras al azar).
   Que esté disponible al menos en el ámbito **Functions**.
3. **Deploys → Trigger deploy → Deploy project**: los cambios de variables se aplican en el siguiente despliegue.

Si falta la variable, el panel avisa: «Falta configurar la variable de entorno ADMIN_TOKEN en Netlify».

> Ojo: el almacén de Blobs es el mismo para producción y para las *deploy previews*. Lo que guardes desde una preview se ve en la web real.

---

## Lista de comprobación para la noche electoral

**Unos días antes (ensayo)**

- [ ] Todas las porras están en `src/data/porras.ts` y `npm run build` pasa sin errores.
- [ ] La web está desplegada y `ADMIN_TOKEN` está definido en Netlify (después, *Trigger deploy*).
- [ ] Desde el móvil, **Iniciar sesión** (arriba, en el centro) con la contraseña: aparece la pestaña **Panel**.
- [ ] **Cargar datos de prueba**: crea un sondeo a las 20:00 y datos de escrutinio a las 21:00, 22:00, 23:00 y 00:00 (100 %).
- [ ] Revisa Directo en el móvil y en el ordenador: clasificación, desglose, gráfica, eventos y «Resultado final».
- [ ] Prueba a corregir un dato (aparece «corregido a las…») y a borrar otro.
- [ ] **Borrar todo** (escribe `BORRAR`). Directo vuelve a mostrar las porras en orden alfabético y «Esperando datos».

**El domingo 29**

- [ ] 20:00 (opcional): mete la encuesta a pie de urna como tipo **Sondeo**.
- [ ] Desde el inicio del escrutinio, **un dato por hora**: elige la franja (o deja la hora por defecto), pon el % escrutado,
      los escaños de PP, PSOE, Vox y FA (Otros se calcula solo) y la participación del Ministerio del Interior (sin CERA).
      Mira la vista previa y guarda.
- [ ] Si te equivocas: **Editar** en la lista de datos. Todos verán «corregido a las HH:MM».
- [ ] Último dato con el **100 % escrutado**: la web pasa a «Resultado final» y marca a quien gana (o a quienes ganan, si hay empate).

La web de cada participante consulta los datos cada 60 segundos mientras la pestaña está visible, y al volver a ella.

---

## API

| Método | Ruta | Qué hace | Requiere token |
| --- | --- | --- | --- |
| `GET` | `/api/snapshots` | Lista de datos, ordenada por hora (`Cache-Control: no-store`) | No |
| `POST` | `/api/snapshots` | Crea un dato (calcula Otros) | Sí |
| `PUT` | `/api/snapshots/:id` | Corrige un dato (rellena `editadoEn`) | Sí |
| `DELETE` | `/api/snapshots/:id` | Borra un dato | Sí |
| `DELETE` | `/api/snapshots` | Borra todos | Sí |
| `GET` | `/api/sesion` | Comprueba la contraseña al iniciar sesión | Sí |

Token: cabecera `Authorization: Bearer <ADMIN_TOKEN>`. Los errores responden con `{ "error": "mensaje en español" }`
(400 si los datos no cuadran, 401 sin permiso, 409 si ya hay un dato a esa hora).
No existe ningún endpoint para modificar apuestas.

Los datos se guardan en Netlify Blobs: almacén `porra-29n`, clave `snapshots` (un array JSON ordenado por hora).
Las escrituras usan concurrencia optimista (ETag) para que dos guardados seguidos no se pisen.

---

## Estructura

```
netlify.toml                    build, Node, regla SPA (/admin) y cabeceras
netlify/functions/snapshots.ts  función /api/snapshots (conecta la lógica con Blobs)
netlify/functions/sesion.ts     función /api/sesion
netlify/lib/                    lógica HTTP probada sin Netlify, almacén (Blobs / memoria), autenticación
scripts/validate-porras.ts      validación previa al build
src/config/eleccion.ts          escaños, mayoría, bloques, administrador y franjas
src/data/porras.ts              las apuestas
src/lib/scoring.ts              puntuación pura: desviaciones, ranking con empates, cambios de líder, series
src/lib/eventos.ts              eventos importantes de la noche (umbrales configurables)
src/lib/snapshots.ts            validación y creación de datos (independiente de la API)
src/lib/…                       horas en Madrid, formato es-ES, datos de prueba, lógica del panel
src/pages/                      Directo y Admin (Iniciar sesión / Panel)
src/components/                 piezas de la interfaz
```

### Fuente automática de resultados (futuro)

La creación de datos está separada de la API: `validarEntrada` y `crearSnapshot` (en `src/lib/snapshots.ts`) más el
almacén de `netlify/lib/almacen.ts`. Una función programada de Netlify podría leer los resultados oficiales, construir
la entrada y guardarla con esas mismas piezas, sin tocar la interfaz.
