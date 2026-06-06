import { useEffect, useMemo, useState } from 'react';
import { Menu, RefreshCcw } from 'lucide-react';
import { crudRequest } from './api/client';
import LoginScreen from './components/auth/LoginScreen';
import CrudModal from './components/forms/CrudModal';
import StatusModal from './components/forms/StatusModal';
import Sidebar from './components/layout/Sidebar';
import Toast from './components/ui/Toast';
import { estadosGenerales } from './constants/app';
import { moduleConfig } from './config/moduleConfig';
import { useCatalogs } from './hooks/useCatalogs';
import { useModuleData } from './hooks/useModuleData';
import AppRoutes from './routes/AppRoutes';
import { modules, moduleTitles } from './routes/modules';
import { normalizeVisitStatus } from './utils/formatters';
import { clearSession, readSession } from './utils/session';

function App() {
  const [session, setSession] = useState(readSession);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [toast, setToast] = useState(null);

  const visibleModules = useMemo(() => {
    const role = session?.user?.rol;
    return modules.filter((module) => module.roles.includes(role));
  }, [session]);

  const { catalogs, catalogLoading } = useCatalogs(session, reloadKey);
  const {
    moduleData,
    setModuleData,
    loading,
    error
  } = useModuleData(activeModule, session, reloadKey);

  useEffect(() => {
    if (!session) return;

    const fallback = session.user?.rol === 'Mecanico'
      ? visibleModules.find((module) => module.key === 'mecanico')?.key || visibleModules[0]?.key
      : visibleModules[0]?.key;

    if (fallback && !visibleModules.some((module) => module.key === activeModule)) {
      setActiveModule(fallback);
    }
  }, [activeModule, session, visibleModules]);

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  const refresh = () => {
    setModuleData((current) => {
      const next = { ...current };
      delete next[activeModule];
      return next;
    });
    setReloadKey((current) => current + 1);
  };

  const showToast = (text, tone = 'success') => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 2800);
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  const openCreate = (moduleKey) => {
    setFormError('');
    setModal({ mode: 'create', moduleKey, row: {} });
  };

  const openEdit = (moduleKey, row) => {
    setFormError('');
    setModal({ mode: 'edit', moduleKey, row });
  };

  const submitCrud = async (payload) => {
    if (!modal) return;

    const config = moduleConfig[modal.moduleKey];
    const method = modal.mode === 'create' ? 'POST' : 'PUT';
    const path = modal.mode === 'create' ? config.path : `${config.path}/${modal.row.id}`;

    setSaving(true);
    setFormError('');
    try {
      await crudRequest({ path, token: session.token, method, body: payload });
      setModal(null);
      showToast('Registro guardado correctamente');
      refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (moduleKey, row) => {
    const config = moduleConfig[moduleKey];
    const options = config.statusOptions || estadosGenerales;

    if (!options.includes('Activo')) {
      setStatusModal({ moduleKey, row, estado: row.estado || options[0], observaciones: '' });
      return;
    }

    const nextEstado = row.estado === 'Activo' ? 'Inactivo' : 'Activo';

    setSaving(true);
    try {
      await crudRequest({
        path: `${config.path}/${row.id}/estado`,
        token: session.token,
        method: 'PATCH',
        body: { estado: normalizeVisitStatus(nextEstado) }
      });
      showToast('Estado actualizado');
      refresh();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const submitStatus = async (event) => {
    event.preventDefault();
    if (!statusModal) return;

    const config = moduleConfig[statusModal.moduleKey];
    setSaving(true);
    try {
      await crudRequest({
        path: `${config.path}/${statusModal.row.id}/estado`,
        token: session.token,
        method: 'PATCH',
        body: {
          estado: normalizeVisitStatus(statusModal.estado),
          observaciones: statusModal.observaciones || undefined
        }
      });
      setStatusModal(null);
      showToast('Estado actualizado');
      refresh();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        items={visibleModules}
        activeModule={activeModule}
        onSelect={(moduleKey) => {
          setActiveModule(moduleKey);
          setSearch('');
        }}
        user={session.user}
        onLogout={logout}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={20} aria-hidden="true" />
          </button>
          <div>
            <h1>{moduleTitles[activeModule]}</h1>
            <p>
              {session.user?.rol === 'Mecanico'
                ? 'Trabajo asignado'
                : catalogLoading ? 'Cargando catalogos' : 'Operacion del taller'}
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={refresh}>
            <RefreshCcw size={17} aria-hidden="true" />
            Actualizar
          </button>
        </header>

        <AppRoutes
          activeModule={activeModule}
          session={session}
          data={moduleData[activeModule]}
          loading={loading}
          error={error}
          search={search}
          onSearch={setSearch}
          onCreate={openCreate}
          onEdit={openEdit}
          onToggleStatus={toggleStatus}
          onRefresh={refresh}
          showToast={showToast}
        />
      </main>

      {modal ? (
        <CrudModal
          modal={modal}
          catalogs={catalogs}
          saving={saving}
          error={formError}
          onClose={() => setModal(null)}
          onSubmit={submitCrud}
        />
      ) : null}
      {statusModal ? (
        <StatusModal
          statusModal={statusModal}
          saving={saving}
          onChange={setStatusModal}
          onClose={() => setStatusModal(null)}
          onSubmit={submitStatus}
        />
      ) : null}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;
