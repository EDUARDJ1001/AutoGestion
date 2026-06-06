const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
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
    clientes: '/clientes',
    vehiculos: '/vehiculos',
    visitas: '/visitas',
    servicios: '/servicios',
    inventario: '/productos',
    mecanico: '/mecanico/mis-trabajos'
  };

  return apiRequest(paths[moduleKey], { token });
};
