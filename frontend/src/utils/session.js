export const sessionKey = 'autogestion.session';

export const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
};

export const saveSession = (session) => {
  localStorage.setItem(sessionKey, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(sessionKey);
};
