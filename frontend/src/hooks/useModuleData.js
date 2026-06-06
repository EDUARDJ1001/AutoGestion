import { useEffect, useState } from 'react';
import { getModuleData } from '../api/client';

export const useModuleData = (activeModule, session, reloadKey) => {
  const [moduleData, setModuleData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session || !activeModule) return;

    let ignore = false;
    setLoading(true);
    setError('');

    getModuleData(activeModule, session.token)
      .then((data) => {
        if (!ignore) {
          setModuleData((current) => ({ ...current, [activeModule]: data }));
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.status === 401 ? 'Sesion expirada' : err.message);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeModule, reloadKey, session]);

  return {
    moduleData,
    setModuleData,
    loading,
    error
  };
};
