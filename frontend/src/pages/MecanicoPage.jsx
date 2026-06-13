import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  ClipboardList,
  Image,
  LoaderCircle,
  PackagePlus,
  Save,
  Search,
  Wrench
} from 'lucide-react';
import { apiRequest, assetUrl, crudRequest } from '../api/client';
import { estadosVisita } from '../constants/app';
import { formatDate, vehicleLabel } from '../utils/formatters';
import { validateImageFile } from '../utils/validation';
import ConfirmModal from '../components/forms/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

const estadosMecanico = estadosVisita.filter((estado) => !['Entregado', 'Cancelado'].includes(estado));
const tiposFoto = ['Vehículo', 'Visita', 'Daño', 'Avance', 'Final', 'VIN', 'Kilometraje', 'Otro'];

const initialNoteForm = {
  diagnostico: '',
  observaciones: ''
};

const initialProductForm = {
  producto_id: '',
  cantidad: '1',
  observaciones: ''
};

function MecanicoPage({ session, data, loading, error, onRefresh, showToast, onRequestError }) {
  const trabajos = data?.trabajos || [];
  const [selectedId, setSelectedId] = useState(undefined);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [query, setQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [productos, setProductos] = useState([]);
  const [noteForm, setNoteForm] = useState(initialNoteForm);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [photoForm, setPhotoForm] = useState({ tipo: 'Avance', descripcion: '', foto: null });
  const [savingAction, setSavingAction] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [productError, setProductError] = useState('');
  const [photoError, setPhotoError] = useState('');

  const filteredTrabajos = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return trabajos
      .filter((trabajo) => !estadoFilter || trabajo.estado === estadoFilter)
      .filter((trabajo) => {
        if (!needle) return true;
        return [
          trabajo.cliente_nombre,
          trabajo.placa,
          trabajo.marca,
          trabajo.modelo,
          trabajo.estado,
          trabajo.motivo_visita
        ].some((value) => String(value || '').toLowerCase().includes(needle));
      });
  }, [estadoFilter, query, trabajos]);

  useEffect(() => {
    if (selectedId === undefined && trabajos[0]?.id) {
      setSelectedId(trabajos[0].id);
    }
  }, [selectedId, trabajos]);

  useEffect(() => {
    let ignore = false;

    apiRequest('/productos?estado=Activo', { token: session.token })
      .then((payload) => {
        if (!ignore) setProductos(payload.productos || []);
      })
      .catch((err) => {
        if (!ignore) {
          onRequestError?.(err);
          setProductos([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [onRequestError, session.token]);

  useEffect(() => {
    if (!selectedId) return;

    let ignore = false;
    setDetailLoading(true);
    setDetailError('');

    apiRequest(`/mecanico/mis-trabajos/${selectedId}`, { token: session.token })
      .then((payload) => {
        if (ignore) return;
        setDetail(payload);
        setNoteForm({
          diagnostico: payload.visita?.diagnostico || '',
          observaciones: payload.visita?.observaciones || ''
        });
      })
      .catch((err) => {
        if (!ignore) setDetailError(onRequestError?.(err) || err.message);
      })
      .finally(() => {
        if (!ignore) setDetailLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [onRequestError, selectedId, session.token]);

  const refreshDetail = async () => {
    if (!selectedId) return;
    const payload = await apiRequest(`/mecanico/mis-trabajos/${selectedId}`, { token: session.token });
    setDetail(payload);
    setNoteForm({
      diagnostico: payload.visita?.diagnostico || '',
      observaciones: payload.visita?.observaciones || ''
    });
  };

  const clearSelection = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError('');
  };

  const updateEstado = async (estado, { skipConfirm = false } = {}) => {
    if (!detail?.visita) return;

    if (!skipConfirm && estado === 'Finalizado') {
      setConfirmModal({
        title: 'Confirmar estado',
        message: 'Se marcara este trabajo como finalizado. Confirma que el avance ya fue revisado.',
        action: () => updateEstado(estado, { skipConfirm: true })
      });
      return;
    }

    setSavingAction(`estado:${estado}`);
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/estado`,
        token: session.token,
        method: 'PATCH',
        body: {
          estado,
          diagnostico: noteForm.diagnostico || undefined,
          observaciones: noteForm.observaciones || undefined
        }
      });
      setDetail(payload);
      showToast('Estado actualizado');
      onRefresh();
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
      setConfirmModal(null);
    }
  };

  const saveNotes = async (event) => {
    event.preventDefault();
    if (!detail?.visita) return;

    setSavingAction('notes');
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/estado`,
        token: session.token,
        method: 'PATCH',
        body: {
          estado: detail.visita.estado,
          diagnostico: noteForm.diagnostico || undefined,
          observaciones: noteForm.observaciones || undefined
        }
      });
      setDetail(payload);
      showToast('Diagnostico guardado');
      onRefresh();
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
    }
  };

  const addProduct = async (event) => {
    event.preventDefault();
    if (!detail?.visita) return;

    const cantidad = Number(productForm.cantidad);

    if (!productForm.producto_id) {
      setProductError('Selecciona un producto');
      return;
    }

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setProductError('La cantidad debe ser un entero mayor a 0');
      return;
    }

    setSavingAction('product');
    setProductError('');
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/productos`,
        token: session.token,
        method: 'POST',
        body: {
          producto_id: Number(productForm.producto_id),
          cantidad,
          observaciones: productForm.observaciones || undefined
        }
      });
      setDetail((current) => ({ ...current, productos: payload.productos || current.productos }));
      setProductForm(initialProductForm);
      showToast('Producto registrado');
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
    }
  };

  const uploadPhoto = async (event) => {
    event.preventDefault();
    if (!detail?.visita) return;

    const validationError = validateImageFile(photoForm.foto);

    if (validationError) {
      setPhotoError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append('tipo', photoForm.tipo);
    formData.append('descripcion', photoForm.descripcion);
    formData.append('foto', photoForm.foto);

    setSavingAction('photo');
    setPhotoError('');
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/fotos`,
        token: session.token,
        method: 'POST',
        body: formData
      });
      setDetail((current) => ({ ...current, fotos: payload.fotos || current.fotos }));
      setPhotoForm({ tipo: 'Avance', descripcion: '', foto: null });
      setPhotoError('');
      event.target.reset();
      showToast('Foto cargada');
      await refreshDetail();
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
    }
  };

  const updateEtapa = async (etapa, estado, { skipConfirm = false } = {}) => {
    if (!detail?.visita) return;

    if (!skipConfirm && ['Completado', 'Omitido'].includes(estado)) {
      setConfirmModal({
        title: 'Confirmar etapa',
        message: `Se marcara la etapa "${etapa.nombre_etapa}" como ${estado}.`,
        action: () => updateEtapa(etapa, estado, { skipConfirm: true })
      });
      return;
    }

    setSavingAction(`etapa:${etapa.id}:${estado}`);
    try {
      const payload = await crudRequest({
        path: `/mecanico/mis-trabajos/${detail.visita.id}/etapas/${etapa.id}`,
        token: session.token,
        method: 'PATCH',
        body: {
          estado,
          observaciones: noteForm.observaciones || undefined
        }
      });
      setDetail(payload);
      showToast('Etapa actualizada');
      onRefresh();
    } catch (err) {
      showToast(onRequestError?.(err) || err.message, 'danger');
    } finally {
      setSavingAction('');
      setConfirmModal(null);
    }
  };

  return (
    <>
      <div className="mechanic-shell">
        <section className="mechanic-list panel">
        <div className="mechanic-toolbar">
          <label className="search-box mechanic-search">
            <Search size={18} aria-hidden="true" />
            <input
              placeholder="Buscar trabajo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select className="mechanic-filter" value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value)}>
            <option value="">Todos</option>
            {estadosMecanico.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>

        {loading ? <EmptyState text="Cargando trabajos..." /> : null}
        {error ? <ErrorState text={error} onRetry={onRefresh} /> : null}
        {!loading && !error && !filteredTrabajos.length ? <EmptyState text="Sin trabajos asignados" /> : null}

        <div className="work-card-list">
          {filteredTrabajos.map((trabajo) => (
            <button
              className={selectedId === trabajo.id ? 'work-card work-card-active' : 'work-card'}
              key={trabajo.id}
              type="button"
              onClick={() => setSelectedId(trabajo.id)}
            >
              <span className="status-pill">{trabajo.estado}</span>
              <strong>{vehicleLabel(trabajo)}</strong>
              <span>{trabajo.cliente_nombre}</span>
              <small>{trabajo.motivo_visita || 'Sin motivo'}</small>
              <div className="work-card-progress">
                <div className="progress-track">
                  <span style={{ width: `${Math.min(Number(trabajo.porcentaje_avance || 0), 100)}%` }} />
                </div>
                <b>{Number(trabajo.porcentaje_avance || 0).toFixed(0)}%</b>
              </div>
            </button>
          ))}
        </div>
        </section>

        <section className="mechanic-detail panel">
        {!selectedId ? <EmptyState text="Selecciona un trabajo" /> : null}
        {detailLoading ? <EmptyState text="Cargando detalle..." /> : null}
        {detailError ? <ErrorState text={detailError} onRetry={refreshDetail} /> : null}
        {!detailLoading && !detailError && detail ? (
          <TrabajoDetalle
            detail={detail}
            noteForm={noteForm}
            productForm={productForm}
            photoForm={photoForm}
            productos={productos}
            savingAction={savingAction}
            onBack={clearSelection}
            onEstado={updateEstado}
            onNoteChange={setNoteForm}
            onProductChange={(updater) => {
              setProductError('');
              setProductForm(updater);
            }}
            onPhotoChange={(updater) => {
              setPhotoError('');
              setPhotoForm(updater);
            }}
            onSaveNotes={saveNotes}
            onAddProduct={addProduct}
            onUploadPhoto={uploadPhoto}
            onUpdateEtapa={updateEtapa}
            productError={productError}
            photoError={photoError}
          />
        ) : null}
        </section>
      </div>
      <ConfirmModal
        confirm={confirmModal}
        saving={Boolean(savingAction)}
        onCancel={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.action?.()}
      />
    </>
  );
}

function TrabajoDetalle({
  detail,
  noteForm,
  productForm,
  photoForm,
  productos,
  savingAction,
  onBack,
  onEstado,
  onNoteChange,
  onProductChange,
  onPhotoChange,
  onSaveNotes,
  onAddProduct,
  onUploadPhoto,
  onUpdateEtapa,
  productError,
  photoError
}) {
  const { visita, servicios = [], productos: productosUsados = [], fotos = [], bitacora = [], etapas = [], progreso } = detail;

  return (
    <div className="work-detail-content">
      <div className="work-detail-header">
        <button className="icon-button mobile-only" type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div>
          <span className="status-pill">{visita.estado}</span>
          <h2>{vehicleLabel(visita)}</h2>
          <p>{visita.cliente_nombre} · {visita.cliente_telefono || visita.cliente_whatsapp || 'Sin telefono'}</p>
        </div>
      </div>

      <section className="mechanic-section">
        <h3>Vehiculo</h3>
        <div className="detail-grid">
          <DetailItem label="Placa" value={visita.placa} />
          <DetailItem label="Marca" value={visita.marca} />
          <DetailItem label="Modelo" value={visita.modelo} />
          <DetailItem label="Color" value={visita.color} />
          <DetailItem label="Anio" value={visita.anio} />
          <DetailItem label="Kilometraje" value={visita.kilometraje_ingreso} />
        </div>
      </section>

      <section className="mechanic-section">
        <h3>Trabajo</h3>
        <div className="work-summary">
          <p><strong>Motivo:</strong> {visita.motivo_visita || 'Sin dato'}</p>
          <p><strong>Problema:</strong> {visita.descripcion_problema || 'Sin dato'}</p>
          <p><strong>Ingreso:</strong> {formatDate(visita.fecha_ingreso)}</p>
        </div>
      </section>

      <section className="mechanic-section">
        <h3>Estado</h3>
        <div className="state-button-grid">
          {estadosMecanico.map((estado) => (
            <button
              className={visita.estado === estado ? 'state-button state-button-active' : 'state-button'}
              key={estado}
              type="button"
              onClick={() => onEstado(estado)}
              disabled={savingAction.startsWith('estado:')}
            >
              {savingAction === `estado:${estado}` ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : null}
              {estado}
            </button>
          ))}
        </div>
      </section>

      <section className="mechanic-section">
        <h3>Linea de trabajo</h3>
        {progreso ? (
          <div className={progreso.alerta_sin_avance ? 'stage-progress stage-progress-warning' : 'stage-progress'}>
            <div className="progress-card-head">
              <div>
                <strong>{progreso.flujo_trabajo || visita.flujo_trabajo_nombre || 'Flujo de trabajo'}</strong>
                <span>{progreso.etapa_actual || 'Sin etapa activa'}</span>
              </div>
              <b>{Number(progreso.porcentaje_avance || 0).toFixed(0)}%</b>
            </div>
            <div className="progress-track">
              <span style={{ width: `${Math.min(Number(progreso.porcentaje_avance || 0), 100)}%` }} />
            </div>
          </div>
        ) : null}
        <div className="stage-list">
          {etapas.length ? etapas.map((etapa) => (
            <article className={`stage-card stage-${String(etapa.estado).toLowerCase().replaceAll(' ', '-')}`} key={etapa.id}>
              <div>
                <strong>{etapa.orden}. {etapa.nombre_etapa}</strong>
                <span>{etapa.estado}</span>
              </div>
              <div className="stage-actions">
                <button type="button" onClick={() => onUpdateEtapa(etapa, 'En proceso')} disabled={savingAction.startsWith(`etapa:${etapa.id}:`)}>
                  En proceso
                </button>
                <button type="button" onClick={() => onUpdateEtapa(etapa, 'Completado')} disabled={savingAction.startsWith(`etapa:${etapa.id}:`)}>
                  Completado
                </button>
                <button type="button" onClick={() => onUpdateEtapa(etapa, 'Omitido')} disabled={savingAction.startsWith(`etapa:${etapa.id}:`)}>
                  Omitir
                </button>
              </div>
            </article>
          )) : <div className="compact-empty">Sin etapas inicializadas</div>}
        </div>
      </section>

      <section className="mechanic-section">
        <h3>Diagnostico y observaciones</h3>
        <form className="mechanic-form" onSubmit={onSaveNotes}>
          <label className="field">
            Diagnostico
            <textarea
              value={noteForm.diagnostico}
              onChange={(event) => onNoteChange((current) => ({ ...current, diagnostico: event.target.value }))}
              rows={4}
            />
          </label>
          <label className="field">
            Observaciones
            <textarea
              value={noteForm.observaciones}
              onChange={(event) => onNoteChange((current) => ({ ...current, observaciones: event.target.value }))}
              rows={3}
            />
          </label>
          <button className="primary-button action-button" type="submit" disabled={savingAction === 'notes'}>
            {savingAction === 'notes' ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
            Guardar avance
          </button>
        </form>
      </section>

      <section className="mechanic-section">
        <h3>Productos usados</h3>
        <form className="mechanic-form product-form" onSubmit={onAddProduct} noValidate>
          <label className="field">
            Producto
            <select
              value={productForm.producto_id}
              onChange={(event) => onProductChange((current) => ({ ...current, producto_id: event.target.value }))}
              required
            >
              <option value="">Seleccionar</option>
              {productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {[producto.codigo, producto.nombre, producto.marca].filter(Boolean).join(' - ')}
                </option>
              ))}
            </select>
          </label>
          <label className="field quantity-field">
            Cantidad
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={productForm.cantidad}
              onChange={(event) => onProductChange((current) => ({ ...current, cantidad: event.target.value.replace(/[^\d]/g, '') }))}
              onKeyDown={(event) => {
                if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) {
                  event.preventDefault();
                }
              }}
              required
            />
          </label>
          <label className="field">
            Observaciones
            <input
              value={productForm.observaciones}
              onChange={(event) => onProductChange((current) => ({ ...current, observaciones: event.target.value }))}
            />
          </label>
          <button className="primary-button action-button" type="submit" disabled={savingAction === 'product'}>
            {savingAction === 'product' ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <PackagePlus size={18} aria-hidden="true" />}
            Registrar producto
          </button>
          {productError ? <div className="form-error full-row">{productError}</div> : null}
        </form>
        <CompactList
          rows={productosUsados}
          empty="Sin productos usados"
          render={(producto) => (
            <>
              <strong>{producto.producto_nombre}</strong>
              <span>{producto.cantidad} {producto.unidad_medida || ''}</span>
            </>
          )}
        />
      </section>

      <section className="mechanic-section">
        <h3>Fotos</h3>
        <form className="mechanic-form photo-form" onSubmit={onUploadPhoto} noValidate>
          <label className="field">
            Tipo
            <select value={photoForm.tipo} onChange={(event) => onPhotoChange((current) => ({ ...current, tipo: event.target.value }))}>
              {tiposFoto.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Descripcion
            <input
              value={photoForm.descripcion}
              onChange={(event) => onPhotoChange((current) => ({ ...current, descripcion: event.target.value }))}
            />
          </label>
          <label className="file-picker">
            <Camera size={20} aria-hidden="true" />
            <span>{photoForm.foto?.name || 'Seleccionar foto'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => onPhotoChange((current) => ({ ...current, foto: event.target.files?.[0] || null }))}
              required
            />
          </label>
          <button className="primary-button action-button" type="submit" disabled={savingAction === 'photo'}>
            {savingAction === 'photo' ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Image size={18} aria-hidden="true" />}
            Subir foto
          </button>
          {photoError ? <div className="form-error full-row">{photoError}</div> : null}
        </form>
        <PhotoGrid fotos={fotos} />
      </section>

      <section className="mechanic-section">
        <h3>Servicios</h3>
        <CompactList
          rows={servicios}
          empty="Sin servicios asignados"
          render={(servicio) => (
            <>
              <strong>{servicio.servicio_nombre}</strong>
              <span>{servicio.estado}</span>
            </>
          )}
        />
      </section>

      <section className="mechanic-section">
        <h3>Bitacora</h3>
        <CompactList
          rows={bitacora}
          empty="Sin historial"
          render={(item) => (
            <>
              <strong>{item.estado_nuevo || item.estado || 'Cambio registrado'}</strong>
              <span>{item.observaciones || item.descripcion || formatDate(item.fecha_creacion)}</span>
            </>
          )}
        />
      </section>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || 'Sin dato'}</strong>
    </div>
  );
}

function CompactList({ rows, empty, render }) {
  if (!rows.length) {
    return <div className="compact-empty">{empty}</div>;
  }

  return (
    <div className="compact-list">
      {rows.map((row, index) => (
        <div className="compact-row" key={row.id || index}>
          {render(row)}
        </div>
      ))}
    </div>
  );
}

function PhotoGrid({ fotos }) {
  if (!fotos.length) {
    return <div className="compact-empty">Sin fotos cargadas</div>;
  }

  return (
    <div className="photo-grid">
      {fotos.map((foto) => (
        <a href={assetUrl(foto.url_archivo)} key={foto.id} target="_blank" rel="noreferrer">
          <img src={assetUrl(foto.url_archivo)} alt={foto.descripcion || foto.tipo || 'Foto de visita'} />
          <span>{foto.tipo}</span>
        </a>
      ))}
    </div>
  );
}

export default MecanicoPage;
