import { AlertTriangle, Boxes, Car, Settings } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import { formatDate, vehicleLabel } from '../utils/formatters';

function DashboardPage({ data, loading }) {
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
