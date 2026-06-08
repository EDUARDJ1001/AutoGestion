import { useEffect, useMemo, useState } from 'react';
import { FileDown, Printer, RefreshCcw } from 'lucide-react';
import { apiRequest } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { formatCurrency, formatDate, optionLabel, vehicleLabel } from '../utils/formatters';

const visitDocuments = [
  { key: 'orden', label: 'Orden de trabajo' },
  { key: 'cotizacion', label: 'Cotizacion' },
  { key: 'recibo', label: 'Recibo/factura simple' },
  { key: 'diagnostico', label: 'Reporte de diagnostico' }
];

const documentOptions = [
  ...visitDocuments,
  { key: 'historial', label: 'Historial del vehiculo' }
];

const titleByDocument = Object.fromEntries(documentOptions.map((item) => [item.key, item.label]));

const sum = (rows, field) => rows.reduce((total, row) => total + Number(row[field] || 0), 0);

function ReportesPage({ session, data, loading, error, onRefresh, onRequestError, showToast }) {
  const visitas = data?.visitas || [];
  const [vehiculos, setVehiculos] = useState([]);
  const [vehiculosLoading, setVehiculosLoading] = useState(false);
  const [vehiculosError, setVehiculosError] = useState('');
  const [documentType, setDocumentType] = useState('orden');
  const [selectedVisitaId, setSelectedVisitaId] = useState('');
  const [selectedVehiculoId, setSelectedVehiculoId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const isVehicleHistory = documentType === 'historial';
  const selectedVisita = useMemo(() => (
    visitas.find((visita) => String(visita.id) === String(selectedVisitaId))
  ), [selectedVisitaId, visitas]);
  const selectedVehiculo = useMemo(() => (
    vehiculos.find((vehiculo) => String(vehiculo.id) === String(selectedVehiculoId))
  ), [selectedVehiculoId, vehiculos]);

  useEffect(() => {
    if (!session?.token) return undefined;

    let ignore = false;
    setVehiculosLoading(true);
    setVehiculosError('');

    apiRequest('/vehiculos', { token: session.token })
      .then((payload) => {
        if (!ignore) setVehiculos(payload.vehiculos || []);
      })
      .catch((err) => {
        if (!ignore) setVehiculosError(onRequestError?.(err) || err.message);
      })
      .finally(() => {
        if (!ignore) setVehiculosLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [onRequestError, session?.token]);

  useEffect(() => {
    setReportData(null);
    setReportError('');
  }, [documentType, selectedVehiculoId, selectedVisitaId]);

  const generateReport = async () => {
    const selectedId = isVehicleHistory ? selectedVehiculoId : selectedVisitaId;

    if (!selectedId) {
      setReportError(isVehicleHistory ? 'Selecciona un vehiculo' : 'Selecciona una visita');
      return;
    }

    setReportLoading(true);
    setReportError('');

    try {
      const payload = isVehicleHistory
        ? await apiRequest(`/vehiculos/${selectedId}/historial`, { token: session.token })
        : await apiRequest(`/visitas/${selectedId}`, { token: session.token });

      setReportData(payload);
    } catch (err) {
      setReportError(onRequestError?.(err) || err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const printReport = () => {
    if (!reportData) {
      showToast?.('Genera el documento antes de imprimir', 'danger');
      return;
    }

    window.print();
  };

  if (loading) return <EmptyState text="Cargando reportes..." />;
  if (error) return <ErrorState text={error} onRetry={onRefresh} />;

  return (
    <div className="reports-shell">
      <section className="panel reports-controls no-print">
        <div className="panel-heading">
          <h2>Documentos imprimibles</h2>
        </div>

        <div className="report-form">
          <label className="field">
            Documento
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {documentOptions.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>

          {isVehicleHistory ? (
            <label className="field">
              Vehiculo
              <select value={selectedVehiculoId} onChange={(event) => setSelectedVehiculoId(event.target.value)}>
                <option value="">Seleccionar vehiculo</option>
                {vehiculos.map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {optionLabel(vehiculo, ['placa', 'marca', 'modelo', 'cliente_nombre']) || `Vehiculo ${vehiculo.id}`}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              Visita
              <select value={selectedVisitaId} onChange={(event) => setSelectedVisitaId(event.target.value)}>
                <option value="">Seleccionar visita</option>
                {visitas.map((visita) => (
                  <option key={visita.id} value={visita.id}>
                    {[
                      visita.id,
                      visita.cliente_nombre,
                      vehicleLabel(visita),
                      visita.estado
                    ].filter(Boolean).join(' - ')}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="report-actions">
            <button className="secondary-button" type="button" onClick={onRefresh}>
              <RefreshCcw size={17} aria-hidden="true" />
              Actualizar
            </button>
            <button className="primary-button" type="button" onClick={generateReport} disabled={reportLoading || vehiculosLoading}>
              <FileDown size={17} aria-hidden="true" />
              {reportLoading ? 'Generando...' : 'Generar'}
            </button>
            <button className="secondary-button" type="button" onClick={printReport} disabled={!reportData}>
              <Printer size={17} aria-hidden="true" />
              Imprimir
            </button>
          </div>
        </div>

        {vehiculosError ? <div className="form-error full-row">{vehiculosError}</div> : null}
        {reportError ? <div className="form-error full-row">{reportError}</div> : null}
      </section>

      <section className="panel report-preview">
        {reportLoading ? <EmptyState text="Generando documento..." /> : null}
        {!reportLoading && !reportData ? (
          <EmptyState text="Selecciona un documento y genera la vista previa" />
        ) : null}
        {!reportLoading && reportData ? (
          isVehicleHistory ? (
            <VehicleHistoryDocument
              data={reportData}
              selectedVehiculo={selectedVehiculo}
            />
          ) : (
            <VisitDocument
              data={reportData}
              documentType={documentType}
              selectedVisita={selectedVisita}
            />
          )
        ) : null}
      </section>
    </div>
  );
}

function DocumentHeader({ title, code }) {
  return (
    <header className="document-header">
      <div>
        <h2>AutoGestion</h2>
        <p>Taller automotriz</p>
      </div>
      <div>
        <strong>{title}</strong>
        <span>{code}</span>
        <small>Emitido: {formatDate(new Date().toISOString())}</small>
      </div>
    </header>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="document-info-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value || 'Sin dato'}</strong>
        </div>
      ))}
    </div>
  );
}

function ServicesTable({ servicios, showDescription = false }) {
  const total = sum(servicios, 'subtotal');

  return (
    <div className="document-section">
      <h3>Servicios</h3>
      <table className="document-table">
        <thead>
          <tr>
            <th>Servicio</th>
            {showDescription ? <th>Detalle</th> : null}
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {servicios.length ? servicios.map((servicio) => (
            <tr key={servicio.id}>
              <td>{servicio.servicio_nombre}</td>
              {showDescription ? <td>{servicio.descripcion_adicional || servicio.observaciones || 'Sin detalle'}</td> : null}
              <td>{Number(servicio.cantidad || 0).toFixed(0)}</td>
              <td>{formatCurrency(servicio.precio_acordado)}</td>
              <td>{formatCurrency(servicio.subtotal)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={showDescription ? 5 : 4}>Sin servicios registrados</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={showDescription ? 4 : 3}>Total servicios</td>
            <td>{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ProductsTable({ productos }) {
  const total = sum(productos, 'subtotal_referencia');

  return (
    <div className="document-section">
      <h3>Productos usados</h3>
      <table className="document-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio ref.</th>
            <th>Subtotal ref.</th>
          </tr>
        </thead>
        <tbody>
          {productos.length ? productos.map((producto) => (
            <tr key={producto.id}>
              <td>{[producto.codigo, producto.producto_nombre, producto.producto_marca].filter(Boolean).join(' - ')}</td>
              <td>{Number(producto.cantidad || 0).toFixed(0)} {producto.unidad_medida || ''}</td>
              <td>{formatCurrency(producto.precio_referencia)}</td>
              <td>{formatCurrency(producto.subtotal_referencia)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4}>Sin productos registrados</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total productos ref.</td>
            <td>{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function VisitDocument({ data, documentType, selectedVisita }) {
  const visita = data.visita || selectedVisita || {};
  const servicios = data.servicios || [];
  const productos = data.productos || [];
  const etapas = data.etapas || [];
  const totalServicios = sum(servicios, 'subtotal');
  const totalProductos = sum(productos, 'subtotal_referencia');
  const grandTotal = totalServicios + totalProductos;
  const title = titleByDocument[documentType];

  return (
    <article className="print-document">
      <DocumentHeader title={title} code={`VIS-${visita.id || 'N/A'}`} />

      <InfoGrid
        items={[
          ['Cliente', visita.cliente_nombre],
          ['Telefono', visita.cliente_telefono || visita.cliente_whatsapp],
          ['Vehiculo', vehicleLabel(visita)],
          ['Kilometraje', visita.kilometraje_ingreso],
          ['Estado', visita.estado],
          ['Ingreso', formatDate(visita.fecha_ingreso)]
        ]}
      />

      {documentType === 'orden' ? (
        <>
          <TextBlock title="Trabajo solicitado" rows={[
            ['Motivo', visita.motivo_visita],
            ['Problema reportado', visita.descripcion_problema],
            ['Entrega estimada', formatDate(visita.fecha_entrega_estimada)],
            ['Mecanico asignado', visita.mecanico_asignado_nombre],
            ['Observaciones', visita.observaciones]
          ]} />
          <StageList etapas={etapas} />
          <SignatureBlock labels={['Recibido por taller', 'Cliente']} />
        </>
      ) : null}

      {documentType === 'cotizacion' ? (
        <>
          <ServicesTable servicios={servicios} showDescription />
          <TotalsBox rows={[
            ['Total cotizado', totalServicios]
          ]} />
          <p className="document-note">Los precios corresponden a lo acordado para esta visita y pueden variar si el cliente autoriza trabajos adicionales.</p>
          <SignatureBlock labels={['Asesor', 'Cliente']} />
        </>
      ) : null}

      {documentType === 'recibo' ? (
        <>
          <ServicesTable servicios={servicios} />
          <ProductsTable productos={productos} />
          <TotalsBox rows={[
            ['Servicios', totalServicios],
            ['Productos ref.', totalProductos],
            ['Total', grandTotal]
          ]} />
          <SignatureBlock labels={['Caja', 'Cliente']} />
        </>
      ) : null}

      {documentType === 'diagnostico' ? (
        <>
          <TextBlock title="Diagnostico" rows={[
            ['Problema reportado', visita.descripcion_problema],
            ['Diagnostico tecnico', visita.diagnostico],
            ['Observaciones', visita.observaciones],
            ['Etapa actual', data.progreso?.etapa_actual]
          ]} />
          <ServicesTable servicios={servicios} showDescription />
          <SignatureBlock labels={['Mecanico / asesor', 'Cliente']} />
        </>
      ) : null}
    </article>
  );
}

function TextBlock({ title, rows }) {
  return (
    <section className="document-section">
      <h3>{title}</h3>
      <div className="document-text-rows">
        {rows.map(([label, value]) => (
          <p key={label}><strong>{label}:</strong> {value || 'Sin dato'}</p>
        ))}
      </div>
    </section>
  );
}

function StageList({ etapas }) {
  return (
    <section className="document-section">
      <h3>Linea de trabajo</h3>
      <div className="document-stage-list">
        {etapas.length ? etapas.map((etapa) => (
          <div key={etapa.id}>
            <strong>{etapa.orden}. {etapa.nombre_etapa}</strong>
            <span>{etapa.estado}</span>
          </div>
        )) : <p>Sin etapas registradas</p>}
      </div>
    </section>
  );
}

function TotalsBox({ rows }) {
  return (
    <div className="document-totals">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{formatCurrency(value)}</strong>
        </div>
      ))}
    </div>
  );
}

function SignatureBlock({ labels }) {
  return (
    <div className="document-signatures">
      {labels.map((label) => (
        <div key={label}>
          <span />
          <strong>{label}</strong>
        </div>
      ))}
    </div>
  );
}

function VehicleHistoryDocument({ data, selectedVehiculo }) {
  const vehiculo = data.vehiculo || selectedVehiculo || {};
  const historial = data.historial || [];

  return (
    <article className="print-document">
      <DocumentHeader title="Historial del vehiculo" code={`VEH-${vehiculo.id || 'N/A'}`} />
      <InfoGrid
        items={[
          ['Cliente', vehiculo.cliente_nombre],
          ['Telefono', vehiculo.cliente_telefono || vehiculo.cliente_whatsapp],
          ['Vehiculo', vehicleLabel(vehiculo)],
          ['VIN', vehiculo.vin],
          ['Color', vehiculo.color],
          ['Kilometraje', vehiculo.kilometraje_actual]
        ]}
      />
      <div className="document-section">
        <h3>Visitas registradas</h3>
        <table className="document-table">
          <thead>
            <tr>
              <th>Ingreso</th>
              <th>Motivo</th>
              <th>Estado</th>
              <th>Diagnostico</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {historial.length ? historial.map((item) => (
              <tr key={item.visita_id}>
                <td>{formatDate(item.fecha_ingreso)}</td>
                <td>{item.motivo_visita || 'Sin dato'}</td>
                <td>{item.estado || 'Sin dato'}</td>
                <td>{item.diagnostico || 'Sin dato'}</td>
                <td>{item.observaciones || 'Sin dato'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5}>Sin historial registrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default ReportesPage;
