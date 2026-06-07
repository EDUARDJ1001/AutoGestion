import { AlertTriangle, Boxes, Car, Settings } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { formatDate, vehicleLabel } from '../utils/formatters';

function DashboardPage({ data, loading, error, onRefresh }) {
  const cards = data?.tarjetas || {};
  const cardItems = [
    ['Vehiculos activos', cards.vehiculos_activos_taller ?? 0, Car],
    ['En proceso', cards.visitas_en_proceso ?? 0, Settings],
    ['Espera repuesto', cards.visitas_en_espera_repuesto ?? 0, AlertTriangle],
    ['Stock bajo', cards.productos_stock_bajo ?? 0, Boxes]
  ];

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

      <section className="panel progress-panel">
        <div className="panel-heading">
          <h2>Progreso en taller</h2>
        </div>
        <div className="progress-list">
          {(data?.progreso_visitas || []).length ? data.progreso_visitas.map((visita) => (
            <article className={visita.alerta_sin_avance ? 'progress-card progress-card-warning' : 'progress-card'} key={visita.visita_id}>
              <div className="progress-card-head">
                <div>
                  <strong>{[visita.placa, visita.marca, visita.modelo].filter(Boolean).join(' - ')}</strong>
                  <span>{visita.cliente} · {visita.flujo_trabajo || 'Sin flujo'}</span>
                </div>
                <b>{Number(visita.porcentaje_avance || 0).toFixed(0)}%</b>
              </div>
              <div className="progress-track" aria-label={`Avance ${visita.porcentaje_avance || 0}%`}>
                <span style={{ width: `${Math.min(Number(visita.porcentaje_avance || 0), 100)}%` }} />
              </div>
              <div className="progress-meta">
                <span>{visita.etapa_actual || 'Sin etapa activa'}</span>
                <span>{visita.alerta_sin_avance ? `Sin avance ${Number(visita.horas_sin_avance || 0).toFixed(0)}h` : formatDate(visita.fecha_ultima_actividad)}</span>
              </div>
            </article>
          )) : <EmptyState text="Sin visitas con flujo activo" />}
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

export default DashboardPage;
