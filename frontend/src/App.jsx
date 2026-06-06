import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  BriefcaseBusiness,
  Car,
  CheckCircle,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  LogIn,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Users,
  UserRoundCog,
  Wrench,
  X
} from 'lucide-react';
import { apiRequest, crudRequest, getModuleData, login } from './api/client';

const sessionKey = 'autogestion.session';
const estadosGenerales = ['Activo', 'Inactivo'];
const estadosVisita = [
  'Recibido',
  'En diagnóstico',
  'Pendiente de aprobación',
  'En proceso',
  'En espera de repuesto',
  'En prueba',
  'Finalizado',
  'Entregado',
  'Cancelado'
];
const roleOptions = [
  { value: 1, label: 'Admin' },
  { value: 2, label: 'Cajero' },
  { value: 3, label: 'Mecanico' }
];

const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Cajero'] },
  { key: 'usuarios', label: 'Usuarios', icon: UserRoundCog, roles: ['Admin'] },
  { key: 'clientes', label: 'Clientes', icon: Users, roles: ['Admin', 'Cajero'] },
  { key: 'vehiculos', label: 'Vehiculos', icon: Car, roles: ['Admin', 'Cajero'] },
  { key: 'visitas', label: 'Visitas', icon: ClipboardList, roles: ['Admin', 'Cajero'] },
  { key: 'servicios', label: 'Servicios', icon: BriefcaseBusiness, roles: ['Admin', 'Cajero'] },
  { key: 'inventario', label: 'Inventario', icon: Boxes, roles: ['Admin', 'Cajero', 'Mecanico'] },
  { key: 'mecanico', label: 'Panel mecanico', icon: Wrench, roles: ['Mecanico'] }
];

const moduleTitles = Object.fromEntries(modules.map((module) => [module.key, module.label]));

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
};

const stripAccents = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeVisitStatus = (value) => {
  const source = stripAccents(value).toLowerCase();
  return estadosVisita.find((estado) => stripAccents(estado).toLowerCase() === source) || value;
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

const optionLabel = (row, fields) => fields.map((field) => row[field]).filter(Boolean).join(' - ');

const filterRows = (rows, query) => {
  if (!query.trim()) return rows;
  const needle = query.trim().toLowerCase();

  return rows.filter((row) => Object.values(row).some((value) => (
    value !== null
    && value !== undefined
    && String(value).toLowerCase().includes(needle)
  )));
};

const hasRole = (session, roles = []) => roles.includes(session?.user?.rol);

const moduleConfig = {
  usuarios: {
    path: '/usuarios',
    resourceKey: 'usuarios',
    createRoles: ['Admin'],
    editRoles: ['Admin'],
    statusRoles: ['Admin'],
    columns: [
      ['nombre', 'Nombre', (_, row) => `${row.nombre || ''} ${row.apellido || ''}`.trim()],
      ['username', 'Usuario'],
      ['rol', 'Rol'],
      ['estado', 'Estado']
    ],
    fields: () => [
      { name: 'rol_id', label: 'Rol', type: 'select', options: roleOptions, required: true, valueType: 'number' },
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'apellido', label: 'Apellido', required: true },
      { name: 'username', label: 'Usuario', required: true, minLength: 3 },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'telefono', label: 'Telefono' },
      { name: 'password', label: 'Contrasena', type: 'password', requiredOnCreate: true, omitEmpty: true, minLength: 6 },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  clientes: {
    path: '/clientes',
    resourceKey: 'clientes',
    createRoles: ['Admin', 'Cajero'],
    editRoles: ['Admin', 'Cajero'],
    statusRoles: ['Admin', 'Cajero'],
    columns: [
      ['nombre', 'Nombre'],
      ['telefono', 'Telefono'],
      ['whatsapp', 'WhatsApp'],
      ['email', 'Email'],
      ['estado', 'Estado']
    ],
    fields: () => [
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'identidad_rtn', label: 'Identidad/RTN' },
      { name: 'telefono', label: 'Telefono' },
      { name: 'whatsapp', label: 'WhatsApp' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'direccion', label: 'Direccion', type: 'textarea' },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  vehiculos: {
    path: '/vehiculos',
    resourceKey: 'vehiculos',
    createRoles: ['Admin', 'Cajero'],
    editRoles: ['Admin', 'Cajero'],
    statusRoles: ['Admin', 'Cajero'],
    columns: [
      ['placa', 'Placa'],
      ['cliente_nombre', 'Cliente'],
      ['marca', 'Marca'],
      ['modelo', 'Modelo'],
      ['estado', 'Estado']
    ],
    fields: ({ clientes }) => [
      { name: 'cliente_id', label: 'Cliente', type: 'select', options: clientes.map((row) => ({ value: row.id, label: row.nombre })), required: true, valueType: 'number' },
      { name: 'placa', label: 'Placa' },
      { name: 'marca', label: 'Marca', required: true },
      { name: 'modelo', label: 'Modelo', required: true },
      { name: 'anio', label: 'Anio', type: 'number', min: 1900, valueType: 'number' },
      { name: 'color', label: 'Color' },
      { name: 'vin', label: 'VIN' },
      { name: 'tipo_vehiculo', label: 'Tipo de vehiculo' },
      { name: 'kilometraje_actual', label: 'Kilometraje', type: 'number', min: 0, valueType: 'number' },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  visitas: {
    path: '/visitas',
    resourceKey: 'visitas',
    createRoles: ['Admin', 'Cajero'],
    editRoles: ['Admin', 'Cajero'],
    statusRoles: ['Admin', 'Cajero'],
    statusOptions: estadosVisita,
    columns: [
      ['cliente_nombre', 'Cliente'],
      ['vehiculo', 'Vehiculo', (_, row) => vehicleLabel(row)],
      ['mecanico_asignado_nombre', 'Mecanico'],
      ['estado', 'Estado'],
      ['fecha_ingreso', 'Ingreso', formatDate]
    ],
    fields: ({ clientes, vehiculos, mecanicos }) => [
      { name: 'cliente_id', label: 'Cliente', type: 'select', options: clientes.map((row) => ({ value: row.id, label: row.nombre })), required: true, valueType: 'number', hideOnEdit: true },
      { name: 'vehiculo_id', label: 'Vehiculo', type: 'select', options: vehiculos.map((row) => ({ value: row.id, label: optionLabel(row, ['placa', 'marca', 'modelo']) || `Vehiculo ${row.id}` })), required: true, valueType: 'number', hideOnEdit: true },
      { name: 'mecanico_asignado_id', label: 'Mecanico asignado', type: 'select', options: mecanicos.map((row) => ({ value: row.id, label: `${row.nombre} ${row.apellido}`.trim() || row.username })), valueType: 'number' },
      { name: 'fecha_entrega_estimada', label: 'Entrega estimada', type: 'datetime-local', valueType: 'date' },
      { name: 'fecha_entrega_real', label: 'Entrega real', type: 'datetime-local', valueType: 'date', hideOnCreate: true },
      { name: 'kilometraje_ingreso', label: 'Kilometraje ingreso', type: 'number', min: 0, valueType: 'number' },
      { name: 'motivo_visita', label: 'Motivo de visita', required: true },
      { name: 'descripcion_problema', label: 'Descripcion del problema', type: 'textarea' },
      { name: 'diagnostico', label: 'Diagnostico', type: 'textarea' },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosVisita, defaultValue: 'Recibido' }
    ]
  },
  servicios: {
    path: '/servicios',
    resourceKey: 'servicios',
    createRoles: ['Admin', 'Cajero'],
    editRoles: ['Admin', 'Cajero'],
    statusRoles: ['Admin', 'Cajero'],
    columns: [
      ['nombre', 'Servicio'],
      ['categoria_nombre', 'Categoria'],
      ['precio_sugerido', 'Precio sugerido'],
      ['estado', 'Estado']
    ],
    fields: ({ categoriasServicio }) => [
      { name: 'categoria_servicio_id', label: 'Categoria', type: 'select', options: categoriasServicio.map((row) => ({ value: row.id, label: row.nombre })), valueType: 'number' },
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'descripcion', label: 'Descripcion', type: 'textarea' },
      { name: 'precio_sugerido', label: 'Precio sugerido', type: 'number', min: 0, step: '0.01', valueType: 'number' },
      { name: 'tiempo_estimado_minutos', label: 'Tiempo estimado min', type: 'number', min: 1, valueType: 'number' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  inventario: {
    path: '/productos',
    resourceKey: 'productos',
    createRoles: ['Admin'],
    editRoles: ['Admin'],
    statusRoles: ['Admin'],
    columns: [
      ['codigo', 'Codigo'],
      ['nombre', 'Producto'],
      ['marca', 'Marca'],
      ['stock_actual', 'Stock'],
      ['estado', 'Estado']
    ],
    fields: ({ categoriasProducto }) => [
      { name: 'categoria_producto_id', label: 'Categoria', type: 'select', options: categoriasProducto.map((row) => ({ value: row.id, label: row.nombre })), valueType: 'number' },
      { name: 'codigo', label: 'Codigo' },
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'marca', label: 'Marca' },
      { name: 'descripcion', label: 'Descripcion', type: 'textarea' },
      { name: 'unidad_medida', label: 'Unidad de medida', defaultValue: 'Unidad' },
      { name: 'stock_inicial', label: 'Stock inicial', type: 'number', min: 0, valueType: 'number', hideOnEdit: true },
      { name: 'stock_minimo', label: 'Stock minimo', type: 'number', min: 0, valueType: 'number' },
      { name: 'costo_promedio', label: 'Costo promedio', type: 'number', min: 0, step: '0.01', valueType: 'number' },
      { name: 'precio_referencia', label: 'Precio referencia', type: 'number', min: 0, step: '0.01', valueType: 'number' },
      { name: 'estado', label: 'Estado', type: 'select', options: estadosGenerales, defaultValue: 'Activo' }
    ]
  },
  mecanico: {
    path: '/mecanico/mis-trabajos',
    resourceKey: 'trabajos',
    columns: [
      ['cliente_nombre', 'Cliente'],
      ['vehiculo', 'Vehiculo', (_, row) => vehicleLabel(row)],
      ['estado', 'Estado'],
      ['fecha_ingreso', 'Ingreso', formatDate]
    ]
  }
};

const getListForModule = (moduleKey, data) => data?.[moduleConfig[moduleKey]?.resourceKey] || [];

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const getFields = (config, catalogs, mode) => (config.fields?.(catalogs) || [])
  .filter((field) => !(mode === 'create' && field.hideOnCreate))
  .filter((field) => !(mode === 'edit' && field.hideOnEdit));

const getInitialForm = (config, catalogs, mode, row = {}) => {
  const fields = getFields(config, catalogs, mode);
  return fields.reduce((acc, field) => {
    const value = row[field.name] ?? field.defaultValue ?? '';
    acc[field.name] = field.type === 'datetime-local' ? toDateTimeLocal(value) : value;
    return acc;
  }, {});
};

const normalizePayload = (form, fields, mode) => {
  return fields.reduce((acc, field) => {
    const rawValue = form[field.name];

    if (field.omitEmpty && rawValue === '') {
      return acc;
    }

    if (rawValue === '' || rawValue === undefined) {
      if (field.required || field.requiredOnCreate) return acc;
      acc[field.name] = null;
      return acc;
    }

    if (field.valueType === 'number') {
      acc[field.name] = Number(rawValue);
      return acc;
    }

    if (field.valueType === 'date') {
      acc[field.name] = new Date(rawValue).toISOString();
      return acc;
    }

    acc[field.name] = field.name === 'estado' && mode !== 'delete'
      ? normalizeVisitStatus(rawValue)
      : rawValue;
    return acc;
  }, {});
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
      const session = { token: data.token, user: data.user };
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

function ModuleView({
  moduleKey,
  session,
  catalogs,
  data,
  loading,
  error,
  search,
  onSearch,
  onCreate,
  onEdit,
  onToggleStatus
}) {
  const config = moduleConfig[moduleKey];
  const rows = filterRows(getListForModule(moduleKey, data), search);
  const canCreate = hasRole(session, config?.createRoles);
  const canEdit = hasRole(session, config?.editRoles);
  const canStatus = hasRole(session, config?.statusRoles);

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

        {canCreate ? (
          <button className="primary-button compact-button" type="button" onClick={() => onCreate(moduleKey)}>
            <Plus size={18} aria-hidden="true" />
            Nuevo
          </button>
        ) : null}
      </div>

      {loading ? <EmptyState text="Cargando datos..." /> : null}
      {error ? <EmptyState text={error} tone="danger" /> : null}
      {!loading && !error ? (
        <SimpleTable
          rows={rows}
          columns={config?.columns || []}
          actions={canEdit || canStatus ? (row) => (
            <div className="row-actions">
              {canEdit ? (
                <button className="icon-button table-action" type="button" onClick={() => onEdit(moduleKey, row)} aria-label="Editar">
                  <Pencil size={17} aria-hidden="true" />
                </button>
              ) : null}
              {canStatus && row.estado ? (
                <button className="icon-button table-action" type="button" onClick={() => onToggleStatus(moduleKey, row)} aria-label="Cambiar estado">
                  <Power size={17} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}
        />
      ) : null}
    </section>
  );
}

function SimpleTable({ rows, columns, actions }) {
  if (!rows.length) {
    return <EmptyState text="Sin registros para mostrar" />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([, label]) => <th key={label}>{label}</th>)}
            {actions ? <th>Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.visita_id || index}>
              {columns.map(([key, , formatter]) => (
                <td data-label={columns.find((column) => column[0] === key)?.[1]} key={key}>
                  {formatter ? formatter(row[key], row) : row[key] ?? 'Sin dato'}
                </td>
              ))}
              {actions ? <td data-label="Acciones">{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CrudModal({ modal, catalogs, saving, error, onClose, onSubmit }) {
  const config = moduleConfig[modal.moduleKey];
  const fields = getFields(config, catalogs, modal.mode);
  const [form, setForm] = useState(() => getInitialForm(config, catalogs, modal.mode, modal.row));

  useEffect(() => {
    setForm(getInitialForm(config, catalogs, modal.mode, modal.row));
  }, [catalogs, config, modal.mode, modal.row]);

  const title = modal.mode === 'create'
    ? `Nuevo ${moduleTitles[modal.moduleKey].toLowerCase()}`
    : `Editar ${moduleTitles[modal.moduleKey].toLowerCase()}`;

  const submit = (event) => {
    event.preventDefault();
    onSubmit(normalizePayload(form, fields, modal.mode), fields);
  };

  return (
    <div className="modal-layer" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="crud-form" onSubmit={submit}>
          {fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              mode={modal.mode}
              value={form[field.name] ?? ''}
              onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
            />
          ))}

          {error ? <div className="form-error full-row">{error}</div> : null}

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
              Guardar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FormField({ field, mode, value, onChange }) {
  const required = Boolean(field.required || (mode === 'create' && field.requiredOnCreate));

  if (field.type === 'textarea') {
    return (
      <label className="field field-wide">
        {field.label}
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          rows={3}
        />
      </label>
    );
  }

  if (field.type === 'select') {
    const options = (field.options || []).map((option) => (
      typeof option === 'string' ? { value: option, label: option } : option
    ));

    return (
      <label className="field">
        {field.label}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        >
          <option value="">Sin seleccionar</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field">
      {field.label}
      <input
        type={field.type || 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        min={field.min}
        step={field.step}
        minLength={field.minLength}
      />
    </label>
  );
}

function StatusModal({ statusModal, saving, onChange, onClose, onSubmit }) {
  return (
    <div className="modal-layer" role="presentation">
      <section className="modal-panel status-panel" role="dialog" aria-modal="true" aria-label="Cambiar estado">
        <div className="modal-header">
          <h2>Cambiar estado</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form className="crud-form" onSubmit={onSubmit}>
          <label className="field">
            Estado
            <select
              value={statusModal.estado}
              onChange={(event) => onChange((current) => ({ ...current, estado: event.target.value }))}
              required
            >
              {estadosVisita.map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </label>
          <label className="field field-wide">
            Observaciones
            <textarea
              value={statusModal.observaciones}
              onChange={(event) => onChange((current) => ({ ...current, observaciones: event.target.value }))}
              rows={3}
            />
          </label>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
              Guardar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function EmptyState({ text, tone = 'neutral' }) {
  return <div className={`empty-state empty-${tone}`}>{text}</div>;
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <button className={`toast toast-${toast.tone || 'success'}`} type="button" onClick={onClose}>
      <CheckCircle size={18} aria-hidden="true" />
      {toast.text}
    </button>
  );
}

function App() {
  const [session, setSession] = useState(readSession);
  const visibleModules = useMemo(() => {
    const role = session?.user?.rol;
    return modules.filter((module) => module.roles.includes(role));
  }, [session]);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [moduleData, setModuleData] = useState({});
  const [catalogs, setCatalogs] = useState({ clientes: [], vehiculos: [], usuarios: [], mecanicos: [], categoriasServicio: [], categoriasProducto: [] });
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [toast, setToast] = useState(null);

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
    if (!session) return;
    let ignore = false;
    const token = session.token;
    const catalogRequests = [
      ['clientes', '/clientes'],
      ['vehiculos', '/vehiculos'],
      ['usuarios', '/usuarios'],
      ['categoriasServicio', '/categorias-servicio'],
      ['categoriasProducto', '/categorias-producto']
    ];

    setCatalogLoading(true);
    Promise.allSettled(catalogRequests.map(([key, path]) => (
      apiRequest(path, { token }).then((data) => [key, data])
    )))
      .then((results) => {
        if (ignore) return;
        const next = { clientes: [], vehiculos: [], usuarios: [], mecanicos: [], categoriasServicio: [], categoriasProducto: [] };
        results.forEach((result) => {
          if (result.status !== 'fulfilled') return;
          const [key, data] = result.value;
          const resourceKey = {
            clientes: 'clientes',
            vehiculos: 'vehiculos',
            usuarios: 'usuarios',
            categoriasServicio: 'categorias',
            categoriasProducto: 'categorias'
          }[key];
          next[key] = data[resourceKey] || [];
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

    const nextEstado = options.includes('Activo')
      ? row.estado === 'Activo' ? 'Inactivo' : 'Activo'
      : row.estado;

    if (!nextEstado || nextEstado === row.estado) return;

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

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  const logout = () => {
    localStorage.removeItem(sessionKey);
    setSession(null);
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

        {activeModule === 'dashboard' ? (
          <DashboardView data={activeData} loading={loading} />
        ) : (
          <ModuleView
            moduleKey={activeModule}
            session={session}
            catalogs={catalogs}
            data={activeData}
            loading={loading}
            error={error}
            search={search}
            onSearch={setSearch}
            onCreate={openCreate}
            onEdit={openEdit}
            onToggleStatus={toggleStatus}
          />
        )}
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
