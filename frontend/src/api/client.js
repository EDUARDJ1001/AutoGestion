export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const API_ORIGIN = new URL(API_URL).origin;

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { ok: false, message: await response.text() };

  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.message || 'No se pudo completar la solicitud');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload.data || {};
};

export const apiRequest = async (path, { token, method = 'GET', body } = {}) => {
  const headers = {};
  const isFormData = body instanceof FormData;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined && !isFormData ? JSON.stringify(body) : body
  });

  return parseResponse(response);
};

export const login = (credentials) => apiRequest('/auth/login', {
  method: 'POST',
  body: credentials
});

export const getModuleData = (moduleKey, token) => {
  const paths = {
    dashboard: '/dashboard/resumen',
    usuarios: '/usuarios',
    clientes: '/clientes',
    vehiculos: '/vehiculos',
    visitas: '/visitas',
    servicios: '/servicios',
    inventario: '/productos',
    mecanico: '/mecanico/mis-trabajos'
  };

  return apiRequest(paths[moduleKey], { token });
};

export const crudRequest = ({ path, token, method, body }) => apiRequest(path, {
  token,
  method,
  body
});

export const assetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path}`;
};
