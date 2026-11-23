/**
 * Se ejecuta antes de cada build (npm run prebuild).
 * Si alguna porra no cuadra, imprime quién falla y cuánto suma, y el build se detiene.
 */
import { ELECCION } from '../src/config/eleccion';
import { PORRAS } from '../src/data/porras';
import { validarPorras } from '../src/lib/porras';

const { errores, avisos } = validarPorras(PORRAS, ELECCION.adminId);

for (const aviso of avisos) console.warn(`⚠  ${aviso}`);

if (errores.length > 0) {
  console.error(`\n✗ Hay ${errores.length} problema(s) en src/data/porras.ts:\n`);
  for (const error of errores) console.error(`  • ${error}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ ${PORRAS.length} porras válidas (todas suman ${ELECCION.totalEscanos}).`);
