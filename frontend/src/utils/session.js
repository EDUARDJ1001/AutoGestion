export const sessionKey = 'autogestion.session';

const validRoles = ['Admin', 'Cajero', 'Mecanico'];

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  return globalThis.atob(padded);
};

export const decodeTokenPayload = (token) => {
  try {
    const [, payload] = String(token || '').split('.');

    if (!payload) return null;

    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
};

export const getSessionExpirationMs = (session) => {
  const payload = decodeTokenPayload(session?.token);

  if (!payload?.exp) return null;

  return payload.exp * 1000;
};

export const isSessionValid = (session) => {
  if (!session?.token || !session?.user?.rol || !validRoles.includes(session.user.rol)) {
    return false;
  }

  const expirationMs = getSessionExpirationMs(session);

  return !expirationMs || expirationMs > Date.now();
};

export const readSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem(sessionKey));

    if (!isSessionValid(session)) {
      localStorage.removeItem(sessionKey);
      return null;
    }

    return session;
  } catch {
    return null;
  }
};

export const saveSession = (session) => {
  if (!isSessionValid(session)) {
    throw new Error('La sesion recibida no es valida');
  }

  localStorage.setItem(sessionKey, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(sessionKey);
};
