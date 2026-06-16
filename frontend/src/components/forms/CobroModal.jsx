import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, Plus, Printer, Receipt, Trash2, X } from 'lucide-react';
import { apiRequest, crudRequest } from '../../api/client';
import { formatCurrency, formatDate, vehicleLabel } from '../../utils/formatters';
import logo from '../../assets/logo.svg';

const TALLER_NOMBRE = 'Miguel Expert Collision';

const sumByTipo = (lineas, tipo) => lineas
  .filter((linea) => linea.tipo === tipo)
  .reduce((total, linea) => total + (Number(linea.cantidad) || 0) * (Number(linea.precio_unitario) || 0), 0);

function CobroModal({ visitaId, token, onClose, onEmitted, showToast, onRequestError }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visita, setVisita] = useState(null);
  const [factura, setFactura] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    apiRequest(`/facturas/resumen/${visitaId}`, { token })
      .then((data) => {
        if (ignore) return;
        setVisita(data.visita || null);
        setFactura(data.factura || null);
        setLineas((data.borrador || []).map((linea) => ({
          ...linea,
          cantidad: Math.round(Number(linea.cantidad) || 0),
          precio_unitario: Math.round(Number(linea.precio_unitario) || 0)
        })));
      })
      .catch((err) => {
        if (!ignore) setError(onRequestError?.(err) || err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [onRequestError, token, visitaId]);

  const totales = useMemo(() => {
    const servicios = sumByTipo(lineas, 'Servicio');
    const materiales = sumByTipo(lineas, 'Material');
    return { servicios, materiales, total: servicios + materiales };
  }, [lineas]);

  const updateLinea = (index, campo, valor) => {
    setLineas((current) => current.map((linea, i) => (i === index ? { ...linea, [campo]: valor } : linea)));
  };

  const addLinea = (tipo) => {
    setLineas((current) => [...current, { tipo, descripcion: '', cantidad: 1, precio_unitario: 0 }]);
  };

  const removeLinea = (index) => {
    setLineas((current) => current.filter((_, i) => i !== index));
  };

  const emitir = async () => {
    const payloadLineas = lineas
      .map((linea) => ({
        tipo: linea.tipo === 'Material' ? 'Material' : 'Servicio',
        descripcion: String(linea.descripcion || '').trim(),
        cantidad: Number(linea.cantidad),
        precio_unitario: Number(linea.precio_unitario)
      }))
      .filter((linea) => linea.descripcion && linea.cantidad > 0 && linea.precio_unitario >= 0);

    if (!payloadLineas.length) {
      setError('Agrega al menos una linea valida (descripcion, cantidad y precio).');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = await crudRequest({
        path: `/facturas/visitas/${visitaId}`,
        token,
        method: 'POST',
        body: { lineas: payloadLineas, observaciones: observaciones || undefined }
      });
      setFactura(data.factura);
      showToast?.(`Factura ${data.factura.numero} emitida`);
      onEmitted?.();
    } catch (err) {
      setError(onRequestError?.(err) || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-layer" role="presentation" onClick={onClose}>
      <section
        className="modal-panel cobro-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Resumen de cobro"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header no-print">
          <div className="modal-title-group">
            <h2>Resumen de cobro</h2>
            {visita ? <span className="modal-step-indicator">{vehicleLabel(visita)} · {visita.cliente_nombre}</span> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="cobro-body"><p className="compact-empty">Cargando resumen...</p></div>
        ) : factura ? (
          <FacturaEmitida factura={factura} visita={visita} error={error} onClose={onClose} />
        ) : (
          <div className="cobro-body">
            <table className="cobro-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descripcion</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {lineas.length ? lineas.map((linea, index) => (
                  <tr key={index}>
                    <td>
                      <select value={linea.tipo} onChange={(event) => updateLinea(index, 'tipo', event.target.value)}>
                        <option value="Servicio">Servicio</option>
                        <option value="Material">Material</option>
                      </select>
                    </td>
                    <td>
                      <input
                        value={linea.descripcion}
                        onChange={(event) => updateLinea(index, 'descripcion', event.target.value)}
                        placeholder="Descripcion"
                        maxLength={255}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={linea.cantidad}
                        onChange={(event) => updateLinea(index, 'cantidad', event.target.value.replace(/[^\d]/g, ''))}
                        onKeyDown={(event) => { if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) event.preventDefault(); }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={linea.precio_unitario}
                        onChange={(event) => updateLinea(index, 'precio_unitario', event.target.value.replace(/[^\d]/g, ''))}
                        onKeyDown={(event) => { if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) event.preventDefault(); }}
                      />
                    </td>
                    <td className="cobro-subtotal">{formatCurrency((Number(linea.cantidad) || 0) * (Number(linea.precio_unitario) || 0))}</td>
                    <td>
                      <button className="icon-button" type="button" onClick={() => removeLinea(index)} aria-label="Quitar linea">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="compact-empty">Sin lineas. Agrega servicios o materiales.</td></tr>
                )}
              </tbody>
            </table>

            <div className="cobro-add-row">
              <button className="secondary-button compact-button" type="button" onClick={() => addLinea('Servicio')}>
                <Plus size={16} aria-hidden="true" /> Servicio
              </button>
              <button className="secondary-button compact-button" type="button" onClick={() => addLinea('Material')}>
                <Plus size={16} aria-hidden="true" /> Material
              </button>
            </div>

            <label className="field">
              Observaciones
              <textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} rows={2} />
            </label>

            <div className="cobro-totales">
              <div><span>Servicios</span><strong>{formatCurrency(totales.servicios)}</strong></div>
              <div><span>Materiales</span><strong>{formatCurrency(totales.materiales)}</strong></div>
              <div className="cobro-total-final"><span>Total</span><strong>{formatCurrency(totales.total)}</strong></div>
            </div>

            {error ? <div className="form-error full-row">{error}</div> : null}

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
              <button className="primary-button" type="button" onClick={emitir} disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Receipt size={18} aria-hidden="true" />}
                Emitir factura
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function FacturaDocument({ factura, visita }) {
  const lineas = factura.lineas || [];

  return (
    <article className="factura-doc">
      <header className="factura-doc-header">
        <div className="factura-doc-brand">
          <img src={logo} alt={TALLER_NOMBRE} />
          <div>
            <h1>{TALLER_NOMBRE}</h1>
            <p>Taller de enderezado y pintura</p>
          </div>
        </div>
        <div className="factura-doc-meta">
          <strong>FACTURA</strong>
          <span>{factura.numero}</span>
          <small>Emitida: {formatDate(factura.fecha_emision)}</small>
        </div>
      </header>

      <div className="factura-doc-info">
        <div><span>Cliente</span><strong>{visita?.cliente_nombre || 'Sin dato'}</strong></div>
        <div><span>Vehiculo</span><strong>{visita ? vehicleLabel(visita) : 'Sin dato'}</strong></div>
        <div><span>Emitida por</span><strong>{factura.emitida_por_nombre || 'Sin dato'}</strong></div>
      </div>

      <table className="factura-doc-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descripcion</th>
            <th className="num">Cant.</th>
            <th className="num">Precio</th>
            <th className="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((linea) => (
            <tr key={linea.id}>
              <td>{linea.tipo}</td>
              <td>{linea.descripcion}</td>
              <td className="num">{Number(linea.cantidad)}</td>
              <td className="num">{formatCurrency(linea.precio_unitario)}</td>
              <td className="num">{formatCurrency(linea.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="factura-doc-totals">
        <div><span>Servicios</span><span>{formatCurrency(factura.subtotal_servicios)}</span></div>
        <div><span>Materiales</span><span>{formatCurrency(factura.subtotal_materiales)}</span></div>
        <div className="factura-doc-total-final"><span>Total</span><span>{formatCurrency(factura.total)}</span></div>
      </div>

      {factura.observaciones ? <p className="factura-doc-note">{factura.observaciones}</p> : null}

      <div className="factura-doc-signs">
        <div>Caja</div>
        <div>Cliente</div>
      </div>
    </article>
  );
}

function FacturaEmitida({ factura, visita, error, onClose }) {
  const handlePrint = () => {
    document.body.classList.add('printing-factura');
    window.print();
    document.body.classList.remove('printing-factura');
  };

  return (
    <div className="cobro-body">
      <FacturaDocument factura={factura} visita={visita} />

      {error ? <div className="form-error full-row no-print">{error}</div> : null}

      <div className="modal-actions no-print">
        <button className="secondary-button" type="button" onClick={onClose}>Cerrar</button>
        <button className="primary-button" type="button" onClick={handlePrint}>
          <Printer size={18} aria-hidden="true" /> Imprimir
        </button>
      </div>

      {createPortal(
        <div className="factura-print-portal">
          <FacturaDocument factura={factura} visita={visita} />
        </div>,
        document.body
      )}
    </div>
  );
}

export default CobroModal;
