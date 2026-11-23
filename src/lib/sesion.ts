/** Contraseña del panel en sessionStorage (se borra al cerrar la pestaña). Tolerante a navegadores que lo bloquean. */
const CLAVE = 'porra29n.token';

export function leerToken(): string | null {
  try {
    return sessionStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function guardarToken(token: string) {
  try {
    sessionStorage.setItem(CLAVE, token);
  } catch {
    /* sin almacenamiento: el token vive solo en memoria */
  }
}

export function borrarToken() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    /* nada que borrar */
  }
}
