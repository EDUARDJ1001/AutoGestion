import { useEffect, useState } from 'react';
import { getModuleData, isForbiddenError, isSessionError } from '../api/client';

export const useModuleData = (activeModule, session, reloadKey, onSessionExpired) => {
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
          if (isSessionError(err)) {
            onSessionExpired?.();
            setError('Sesion expirada');
            return;
          }

          if (isForbiddenError(err)) {
            setError('No tienes permiso para abrir este modulo');
            return;
          }

          setError(err.message);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeModule, onSessionExpired, reloadKey, session]);

  return {
    moduleData,
    setModuleData,
    loading,
    error
  };
};
