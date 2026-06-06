import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { stripAccents } from '../utils/formatters';

const initialCatalogs = {
  clientes: [],
  vehiculos: [],
  usuarios: [],
  mecanicos: [],
  categoriasServicio: [],
  categoriasProducto: []
};

const catalogRequests = [
  ['clientes', '/clientes'],
  ['vehiculos', '/vehiculos'],
  ['usuarios', '/usuarios'],
  ['categoriasServicio', '/categorias-servicio'],
  ['categoriasProducto', '/categorias-producto']
];

const resourceKeys = {
  clientes: 'clientes',
  vehiculos: 'vehiculos',
  usuarios: 'usuarios',
  categoriasServicio: 'categorias',
  categoriasProducto: 'categorias'
};

export const useCatalogs = (session, reloadKey) => {
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
          if (result.status !== 'fulfilled') return;

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
  }, [reloadKey, session]);

  return {
    catalogs,
    catalogLoading
  };
};
