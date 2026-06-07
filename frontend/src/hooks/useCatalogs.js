import { useEffect, useState } from 'react';
import { apiRequest, isAuthError } from '../api/client';
import { stripAccents } from '../utils/formatters';

const initialCatalogs = {
  clientes: [],
  vehiculos: [],
  usuarios: [],
  mecanicos: [],
  categoriasServicio: [],
  categoriasProducto: [],
  flujosTrabajo: []
};

const catalogRequests = [
  ['clientes', '/clientes'],
  ['vehiculos', '/vehiculos'],
  ['usuarios', '/usuarios'],
  ['categoriasServicio', '/categorias-servicio'],
  ['categoriasProducto', '/categorias-producto'],
  ['flujosTrabajo', '/flujos-trabajo']
];

const resourceKeys = {
  clientes: 'clientes',
  vehiculos: 'vehiculos',
  usuarios: 'usuarios',
  categoriasServicio: 'categorias',
  categoriasProducto: 'categorias',
  flujosTrabajo: 'flujos'
};

export const useCatalogs = (session, reloadKey, onSessionExpired) => {
  const [catalogs, setCatalogs] = useState(initialCatalogs);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    if (!session) return;

    let ignore = false;
    const token = session.token;

    setCatalogLoading(true);
    Promise.allSettled(catalogRequests.map(([key, path]) => (
      apiRequest(path, { token }).then((data) => [key, data])
    )))
      .then((results) => {
        if (ignore) return;

        const next = { ...initialCatalogs };
        results.forEach((result) => {
          if (result.status !== 'fulfilled') {
            if (isAuthError(result.reason)) {
              onSessionExpired?.();
            }

            return;
          }

          const [key, data] = result.value;
          next[key] = data[resourceKeys[key]] || [];
        });
        next.mecanicos = next.usuarios.filter((user) => stripAccents(user.rol).toLowerCase() === 'mecanico');
        setCatalogs(next);
      })
      .finally(() => {
        if (!ignore) setCatalogLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [onSessionExpired, reloadKey, session]);

  return {
    catalogs,
    catalogLoading
  };
};
