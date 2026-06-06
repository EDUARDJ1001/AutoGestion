import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  BriefcaseBusiness,
  Car,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { getModuleData, login } from './api/client';

const sessionKey = 'autogestion.session';

const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Cajero'] },
  { key: 'clientes', label: 'Clientes', icon: Users, roles: ['Admin', 'Cajero'] },
  { key: 'vehiculos', label: 'Vehiculos', icon: Car, roles: ['Admin', 'Cajero'] },
  { key: 'visitas', label: 'Visitas', icon: ClipboardList, roles: ['Admin', 'Cajero'] },
  { key: 'servicios', label: 'Servicios', icon: BriefcaseBusiness, roles: ['Admin', 'Cajero'] },
  { key: 'inventario', label: 'Inventario', icon: Boxes, roles: ['Admin', 'Cajero', 'Mecanico'] },
  { key: 'mecanico', label: 'Panel mecanico', icon: Wrench, roles: ['Mecanico'] }
];

const moduleTitles = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  vehiculos: 'Vehiculos',
  visitas: 'Visitas',
  servicios: 'Servicios',
  inventario: 'Inventario',
  mecanico: 'Panel mecanico'
};

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
};

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

const vehicleLabel = (row) => {
  const parts = [row.marca, row.modelo].filter(Boolean).join(' ');
  return [row.placa, parts].filter(Boolean).join(' - ') || row.vehiculo || 'Sin dato';
};

const getListForModule = (moduleKey, data) => {
  const keys = {
    clientes: 'clientes',
    vehiculos: 'vehiculos',
    visitas: 'visitas',
    servicios: 'servicios',
    inventario: 'productos',
    mecanico: 'trabajos'
  };

  return data?.[keys[moduleKey]] || [];
};

const filterRows = (rows, query) => {
  if (!query.trim()) return rows;
  const needle = query.trim().toLowerCase();

  return rows.filter((row) => Object.values(row).some((value) => (
    value !== null
    && value !== undefined
    && String(value).toLowerCase().includes(needle)
  )));
};

function LoginScreen({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(credentials);
      const session = {
        token: data.token,
        user: data.user
      };
      localStorage.setItem(sessionKey, JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Inicio de sesion">
        <div className="brand-mark">
          <Gauge size={34} aria-hidden="true" />
        </div>
        <h1>AutoGestion</h1>
        <p>Acceso operativo del taller</p>

        <form className="login-form" onSubmit={submit}>
          <label>
            Usuario
            <input
              autoComplete="username"
              value={credentials.username}
              onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </label>
          <label>
            Contrasena
            <input
              autoComplete="current-password"
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            <LogIn size={18} aria-hidden="true" />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Sidebar({ items, activeModule, onSelect, user, onLogout, open, onClose }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="app-lockup">
            <span className="app-icon"><Gauge size={24} aria-hidden="true" /></span>
            <div>
              <strong>AutoGestion</strong>
              <small>Taller</small>
            </div>
          </div>
          <button className="icon-button mobile-only" type="button" onClick={onClose} aria-label="Cerrar menu">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="nav-list" aria-label="Modulos">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activeModule === item.key ? 'nav-item nav-item-active' : 'nav-item'}
                type="button"
                onClick={() => {
                  onSelect(item.key);
                  onClose();
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="user-box">
          <div className="user-avatar">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div>
            <strong>{user?.nombre || user?.username}</strong>
            <small>{user?.rol}</small>
          </div>
          <button className="icon-button" type="button" onClick={onLogout} aria-label="Cerrar sesion">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>
      <button className={`scrim ${open ? 'scrim-visible' : ''}`} type="button" onClick={onClose} aria-label="Cerrar menu" />
    </>
  );
}

function DashboardView({ data, loading }) {
  const cards = data?.tarjetas || {};
  const cardItems = [
    ['Vehiculos activos', cards.vehiculos_activos_taller ?? 0, Car],
    ['En proceso', cards.visitas_en_proceso ?? 0, Settings],
    ['Espera repuesto', cards.visitas_en_espera_repuesto ?? 0, AlertTriangle],
    ['Stock bajo', cards.productos_stock_bajo ?? 0, Boxes]
  ];

  if (loading) return <EmptyState text="Cargando dashboard..." />;

  return (
    <div className="dashboard-grid">
      <section className="metric-grid">
        {cardItems.map(([label, value, Icon]) => (
          <article className="metric-card" key={label}>
            <span className="metric-icon"><Icon size={20} aria-hidden="true" /></span>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <h2>Visitas recientes</h2>
        </div>
        <SimpleTable
          rows={data?.visitas_recientes || []}
          columns={[
            ['cliente_nombre', 'Cliente'],
            ['vehiculo', 'Vehiculo', (_, row) => vehicleLabel(row)],
            ['estado', 'Estado'],
            ['fecha_ingreso', 'Ingreso', formatDate]
          ]}
        />
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <h2>Stock bajo</h2>
        </div>
        <SimpleTable
          rows={data?.stock_bajo || []}
          columns={[
            ['nombre', 'Producto'],
            ['marca', 'Marca'],
            ['stock_actual', 'Stock'],
            ['stock_minimo', 'Minimo']
          ]}
        />
      </section>
    </div>
  );
}

function ModuleView({ moduleKey, data, loading, error, search, onSearch }) {
  const rows = filterRows(getListForModule(moduleKey, data), search);
  const columnsByModule = {
    clientes: [
      ['nombre', 'Nombre'],
      ['telefono', 'Telefono'],
      ['whatsapp', 'WhatsApp'],
      ['estado', 'Estado']
    ],
    vehiculos: [
      ['placa', 'Placa'],
      ['cliente_nombre', 'Cliente'],
      ['marca', 'Marca'],
      ['modelo', 'Modelo'],
      ['estado', 'Estado']
    ],
    visitas: [
      ['cliente_nombre', 'Cliente'],
      ['vehiculo', 'Vehiculo', (_, row) => vehicleLabel(row)],
      ['estado', 'Estado'],
      ['fecha_ingreso', 'Ingreso', formatDate]
    ],
    servicios: [
      ['nombre', 'Servicio'],
      ['categoria_nombre', 'Categoria'],
      ['estado', 'Estado']
    ],
    inventario: [
      ['codigo', 'Codigo'],
      ['nombre', 'Producto'],
      ['marca', 'Marca'],
      ['stock_actual', 'Stock'],
      ['estado', 'Estado']
    ],
    mecanico: [
      ['cliente_nombre', 'Cliente'],
      ['vehiculo', 'Vehiculo', (_, row) => vehicleLabel(row)],
      ['estado', 'Estado'],
      ['fecha_ingreso', 'Ingreso', formatDate]
    ]
  };

  return (
    <section className="panel">
      <div className="toolbar">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            placeholder={`Buscar en ${moduleTitles[moduleKey].toLowerCase()}`}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
      </div>

      {loading ? <EmptyState text="Cargando datos..." /> : null}
      {error ? <EmptyState text={error} tone="danger" /> : null}
      {!loading && !error ? (
        <SimpleTable rows={rows} columns={columnsByModule[moduleKey] || []} />
      ) : null}
    </section>
  );
}

function SimpleTable({ rows, columns }) {
  if (!rows.length) {
    return <EmptyState text="Sin registros para mostrar" />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([, label]) => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map(([key, , formatter]) => (
                <td key={key}>{formatter ? formatter(row[key], row) : row[key] ?? 'Sin dato'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ text, tone = 'neutral' }) {
  return <div className={`empty-state empty-${tone}`}>{text}</div>;
}

function App() {
  const [session, setSession] = useState(readSession);
  const visibleModules = useMemo(() => {
    const role = session?.user?.rol;
    return modules.filter((module) => module.roles.includes(role));
  }, [session]);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [moduleData, setModuleData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!session) return;
    const fallback = session.user?.rol === 'Mecanico'
      ? visibleModules.find((module) => module.key === 'mecanico')?.key || visibleModules[0]?.key
      : visibleModules[0]?.key;
    if (fallback && !visibleModules.some((module) => module.key === activeModule)) {
      setActiveModule(fallback);
    }
  }, [activeModule, session, visibleModules]);

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

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  const logout = () => {
    localStorage.removeItem(sessionKey);
    setSession(null);
  };

  const refresh = () => {
    setModuleData((current) => {
      const next = { ...current };
      delete next[activeModule];
      return next;
    });
    setReloadKey((current) => current + 1);
  };

  const activeData = moduleData[activeModule];

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
            <p>{session.user?.rol === 'Mecanico' ? 'Trabajo asignado' : 'Operacion del taller'}</p>
          </div>
          <button className="secondary-button" type="button" onClick={refresh}>
            <RefreshCcw size={17} aria-hidden="true" />
            Actualizar
          </button>
        </header>

        {activeModule === 'dashboard' ? (
          <DashboardView data={activeData} loading={loading} />
        ) : (
          <ModuleView
            moduleKey={activeModule}
            data={activeData}
            loading={loading}
            error={error}
            search={search}
            onSearch={setSearch}
          />
        )}
      </main>
    </div>
  );
}

export default App;
