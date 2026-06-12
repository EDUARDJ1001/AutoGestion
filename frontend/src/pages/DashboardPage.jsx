import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Car, Filter, Search, Settings } from 'lucide-react';
import carImage from '../assets/car.png';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { formatDate, stripAccents, vehicleLabel } from '../utils/formatters';

const normalizeText = (value) => stripAccents(value).toLowerCase();

const stageClass = (estado) => `timeline-step timeline-step-${normalizeText(estado).replace(/\s+/g, '-')}`;

const uniqueOptions = (rows, field) => [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort();

const formatLastActivity = (visita) => {
  if (visita.alerta_sin_avance) {
    return `Sin avance ${Number(visita.horas_sin_avance || 0).toFixed(0)}h`;
  }

  return formatDate(visita.fecha_ultima_actividad);
};

function DashboardPage({ data, loading, error, onRefresh }) {
  const cards = data?.tarjetas || {};
  const progresoVisitas = data?.progreso_visitas || [];
  const [timelineFilters, setTimelineFilters] = useState({
    search: '',
    flujo: '',
    estado: '',
    alerta: 'todos'
  });
  const cardItems = [
    ['Vehiculos activos', cards.vehiculos_activos_taller ?? 0, Car],
    ['En proceso', cards.visitas_en_proceso ?? 0, Settings],
    ['Espera repuesto', cards.visitas_en_espera_repuesto ?? 0, AlertTriangle],
    ['Stock bajo', cards.productos_stock_bajo ?? 0, Boxes]
  ];
  const flujoOptions = useMemo(() => uniqueOptions(progresoVisitas, 'flujo_trabajo'), [progresoVisitas]);
  const estadoOptions = useMemo(() => uniqueOptions(progresoVisitas, 'estado_visita'), [progresoVisitas]);
  const filteredTimeline = useMemo(() => {
    const needle = normalizeText(timelineFilters.search);

    return progresoVisitas.filter((visita) => {
      const matchesSearch = !needle || [
        visita.cliente,
        visita.placa,
        visita.marca,
        visita.modelo,
        visita.mecanico_asignado,
        visita.flujo_trabajo,
        visita.etapa_actual
      ].some((value) => normalizeText(value).includes(needle));
      const matchesFlujo = !timelineFilters.flujo || visita.flujo_trabajo === timelineFilters.flujo;
      const matchesEstado = !timelineFilters.estado || visita.estado_visita === timelineFilters.estado;
      const matchesAlerta = timelineFilters.alerta === 'todos'
        || (timelineFilters.alerta === 'alertas' && visita.alerta_sin_avance)
        || (timelineFilters.alerta === 'normal' && !visita.alerta_sin_avance);

      return matchesSearch && matchesFlujo && matchesEstado && matchesAlerta;
    });
  }, [progresoVisitas, timelineFilters]);
  const alertasSinAvance = progresoVisitas.filter((visita) => visita.alerta_sin_avance).length;

  if (loading) return <EmptyState text="Cargando dashboard..." />;
  if (error) return <ErrorState text={error} onRetry={onRefresh} />;

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
        <DataTable
          rows={data?.visitas_recientes || []}
          columns={[
            ['cliente', 'Cliente', (value, row) => value || row.cliente_nombre || 'Sin dato'],
            ['vehiculo', 'Vehiculo', (_, row) => vehicleLabel(row)],
            ['estado', 'Estado'],
            ['fecha_ingreso', 'Ingreso', formatDate]
          ]}
        />
      </section>

      <section className="panel timeline-panel">
        <div className="panel-heading timeline-heading">
          <div>
            <h2>Linea de taller</h2>
            <span>{filteredTimeline.length} visibles · {alertasSinAvance} alertas</span>
          </div>
          <Filter size={18} aria-hidden="true" />
        </div>

        <div className="timeline-filters">
          <label className="search-box timeline-search">
            <Search size={18} aria-hidden="true" />
            <input
              placeholder="Buscar vehiculo, cliente o etapa"
              value={timelineFilters.search}
              onChange={(event) => setTimelineFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </label>
          <select value={timelineFilters.flujo} onChange={(event) => setTimelineFilters((current) => ({ ...current, flujo: event.target.value }))}>
            <option value="">Todos los flujos</option>
            {flujoOptions.map((flujo) => <option key={flujo} value={flujo}>{flujo}</option>)}
          </select>
          <select value={timelineFilters.estado} onChange={(event) => setTimelineFilters((current) => ({ ...current, estado: event.target.value }))}>
            <option value="">Todos los estados</option>
            {estadoOptions.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
          </select>
          <select value={timelineFilters.alerta} onChange={(event) => setTimelineFilters((current) => ({ ...current, alerta: event.target.value }))}>
            <option value="todos">Todas</option>
            <option value="alertas">Sin avance</option>
            <option value="normal">Sin alerta</option>
          </select>
        </div>

        <div className="timeline-list">
          {filteredTimeline.length ? filteredTimeline.map((visita) => (
            <TimelineCard visita={visita} key={visita.visita_id} />
          )) : <EmptyState text="Sin vehiculos con esos filtros" />}
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <h2>Stock bajo</h2>
        </div>
        <DataTable
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

function TimelineCard({ visita }) {
  const etapas = visita.etapas || [];
  const percent = Math.min(Number(visita.porcentaje_avance || 0), 100);
  const vehicle = [visita.placa, visita.marca, visita.modelo].filter(Boolean).join(' - ') || 'Vehiculo sin dato';

  return (
    <article className={visita.alerta_sin_avance ? 'timeline-card timeline-card-warning' : 'timeline-card'}>
      <div className="timeline-card-header">
        <div>
          <span className={visita.alerta_sin_avance ? 'timeline-alert-pill' : 'timeline-status-pill'}>
            {visita.alerta_sin_avance ? 'Sin avance' : visita.estado_visita}
          </span>
          <h3>{vehicle}</h3>
          <p>{visita.cliente || 'Sin cliente'} · {visita.flujo_trabajo || 'Sin flujo'} · {visita.mecanico_asignado || 'Sin mecanico'}</p>
        </div>
        <strong>{percent.toFixed(0)}%</strong>
      </div>

      <div className="timeline-road" style={{ '--timeline-progress': `${percent}%` }}>
        <div className="progress-track timeline-track" aria-label={`Avance ${percent}%`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <img className="timeline-car-marker" src={carImage} alt="" aria-hidden="true" />
        <span className="timeline-finish" aria-hidden="true" />
      </div>

      <div className="timeline-steps">
        {etapas.length ? etapas.map((etapa) => (
          <div className={stageClass(etapa.estado)} key={etapa.id}>
            <span>{etapa.orden}</span>
            <strong>{etapa.nombre_etapa}</strong>
            <small>{etapa.estado}</small>
          </div>
        )) : (
          <div className="timeline-step timeline-step-empty">
            <span>0</span>
            <strong>{visita.etapa_actual || 'Sin etapas'}</strong>
            <small>{visita.estado_etapa || 'Pendiente'}</small>
          </div>
        )}
      </div>

      <div className="timeline-card-footer">
        <span>{visita.etapa_actual || 'Sin etapa activa'}</span>
        <span>{formatLastActivity(visita)}</span>
      </div>
    </article>
  );
}

export default DashboardPage;
