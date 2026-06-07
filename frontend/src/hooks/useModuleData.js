import { useEffect, useState } from 'react';
import { getModuleData, isAuthError } from '../api/client';

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
          if (isAuthError(err)) {
            onSessionExpired?.();
            setError('Sesion expirada');
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
