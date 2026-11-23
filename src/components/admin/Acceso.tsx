import { useState, type FormEvent } from 'react';
import { comprobarToken, ErrorApi } from '../../lib/api';
import { Boton, claseEtiqueta, claseInput } from '../ui';

/** Pide la contraseña (ADMIN_TOKEN) una vez; el panel la guarda en sessionStorage. */
export function Acceso({ aviso, onEntrar }: { aviso: string | null; onEntrar: (token: string) => void }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [comprobando, setComprobando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setComprobando(true);
    setError(null);
    try {
      await comprobarToken(token.trim());
      onEntrar(token.trim());
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo comprobar la contraseña.');
    } finally {
      setComprobando(false);
    }
  }

  return (
    <div className="pt-8">
      <h1 className="font-display text-[22px] font-semibold">Iniciar sesión</h1>
      <p className="mt-1.5 text-[14px] text-secundario">
        Solo para el administrador. Con la sesión iniciada aparece la pestaña Panel para meter los resultados.
      </p>
      {aviso && (
        <p role="status" className="mt-4 text-[13px] text-error">
          {aviso}
        </p>
      )}
      <form onSubmit={entrar} className="mt-6 max-w-sm space-y-4">
        <div>
          <label htmlFor="token" className={claseEtiqueta}>
            Contraseña
          </label>
          <input
            id="token"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={token}
            onChange={(e) => setToken(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'token-error' : undefined}
            className={`${claseInput} font-sans text-[16px]`}
          />
          {error && (
            <p id="token-error" role="alert" className="mt-2 text-[13px] text-error">
              {error}
            </p>
          )}
        </div>
        <Boton type="submit" variante="primario" disabled={comprobando || !token.trim()} className="w-full">
          {comprobando ? 'Comprobando…' : 'Iniciar sesión'}
        </Boton>
      </form>
    </div>
  );
}
