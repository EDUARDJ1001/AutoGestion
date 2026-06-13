import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Save } from 'lucide-react';
import { apiRequest } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import SearchSelect from '../components/ui/SearchSelect';
import { formatDate, optionLabel, vehicleLabel } from '../utils/formatters';

const checklistSections = [
  {
    key: 'exteriores',
    title: 'Exteriores',
    items: [
      'Unidad de luces',
      'Cristales',
      'Espejos laterales',
      'Cierres',
      'Emblemas',
      'Llantas',
      'Tapones de ruedas',
      'Antena',
      'Tapa de gasolina',
      'Bocina',
      'Limpiadores'
    ]
  },
  {
    key: 'interiores',
    title: 'Interiores',
    items: [
      'Instrumentos de tablero',
      'Calefaccion',
      'Radio',
      'Bloqueos',
      'Encendedor',
      'Espejo retrovisor',
      'Cenicero',
      'Alfombras',
      'Botones interiores',
      'Manijas de puerta',
      'Tapetes',
      'Viseras'
    ]
  },
  {
    key: 'accesorios',
    title: 'Accesorios',
    items: [
      'Gato',
      'Maneral de gato',
      'Llave de rines',
      'Equipo de herramientas',
      'Triangulo de seguridad',
      'Llanta de refaccion',
      'Cable pasacorriente'
    ]
  },
  {
    key: 'componentes_mecanicos',
    title: 'Componentes mecanicos',
    items: [
      'Discos',
      'Tapon de aceite',
      'Tapa de radiador',
      'Varilla de aceite',
      'Filtro de aire',
      'Bateria'
    ]
  }
];

const emptyChecklist = () => checklistSections.reduce((acc, section) => {
  acc[section.key] = Object.fromEntries(section.items.map((item) => [item, false]));
  return acc;
}, {});

const initialForm = () => ({
  nivel_combustible: '',
  trabajo_a_realizar: '',
  comentarios_cliente: '',
  autoriza_presupuesto_previo: false,
  autoriza_sin_presupuesto: false,
  autoriza_pruebas: false,
  acepta_condiciones: false,
  nombre_aceptacion: '',
  firma_cliente: '',
  ...emptyChecklist()
});

const mergeChecklist = (recepcion = {}) => checklistSections.reduce((acc, section) => {
  acc[section.key] = {
    ...Object.fromEntries(section.items.map((item) => [item, false])),
    ...(recepcion[section.key] || {})
  };
  return acc;
}, {});

function RecepcionPage({ session, data, loading, error, onRefresh, onRequestError, showToast }) {
  const visitas = data?.visitas || [];
  const [selectedVisitaId, setSelectedVisitaId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [recepcionLoading, setRecepcionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const selectedVisita = useMemo(() => (
    visitas.find((visita) => String(visita.id) === String(selectedVisitaId))
  ), [selectedVisitaId, visitas]);

  useEffect(() => {
    if (!selectedVisitaId || !session?.token) {
      setForm(initialForm());
      return undefined;
    }

    let ignore = false;
    setRecepcionLoading(true);
    setFormError('');

    apiRequest(`/visitas/${selectedVisitaId}/recepcion`, { token: session.token })
      .then((payload) => {
        if (ignore) return;
        const recepcion = payload.recepcion || {};
        setForm({
          ...initialForm(),
          ...mergeChecklist(recepcion),
          nivel_combustible: recepcion.nivel_combustible ?? '',
          trabajo_a_realizar: recepcion.trabajo_a_realizar || '',
          comentarios_cliente: recepcion.comentarios_cliente || '',
          autoriza_presupuesto_previo: Boolean(recepcion.autoriza_presupuesto_previo),
          autoriza_sin_presupuesto: Boolean(recepcion.autoriza_sin_presupuesto),
          autoriza_pruebas: Boolean(recepcion.autoriza_pruebas),
          acepta_condiciones: Boolean(recepcion.acepta_condiciones),
          nombre_aceptacion: recepcion.nombre_aceptacion || '',
          firma_cliente: recepcion.firma_cliente || ''
        });
      })
      .catch((err) => {
        if (!ignore) setFormError(onRequestError?.(err) || err.message);
      })
      .finally(() => {
        if (!ignore) setRecepcionLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [onRequestError, selectedVisitaId, session?.token]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateChecklist = (sectionKey, item, checked) => {
    setForm((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        [item]: checked
      }
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!selectedVisitaId) {
      setFormError('Selecciona una visita');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await apiRequest(`/visitas/${selectedVisitaId}/recepcion`, {
        token: session.token,
        method: 'PUT',
        body: {
          ...form,
          nivel_combustible: form.nivel_combustible === '' ? null : Number.parseInt(form.nivel_combustible, 10)
        }
      });
      showToast?.('Recepcion guardada correctamente');
    } catch (err) {
      setFormError(onRequestError?.(err) || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <EmptyState text="Cargando visitas..." />;
  if (error) return <ErrorState text={error} onRetry={onRefresh} />;

  return (
    <div className="reception-shell">
      <section className="panel reception-controls">
        <div className="panel-heading">
          <h2>Recepcion de vehiculo</h2>
          <button className="secondary-button compact-button" type="button" onClick={onRefresh}>
            <RefreshCcw size={17} aria-hidden="true" />
            Actualizar
          </button>
        </div>

        <label className="field">
          Visita activa
          <SearchSelect
            value={selectedVisitaId}
            onChange={setSelectedVisitaId}
            placeholder="Buscar visita por numero o cliente"
            emptyText="Sin visitas que coincidan"
            options={visitas.map((visita) => ({
              value: visita.id,
              label: optionLabel({
                orden: `VIS-${visita.id}`,
                cliente: visita.cliente_nombre,
                vehiculo: vehicleLabel(visita),
                estado: visita.estado
              }, ['orden', 'cliente', 'vehiculo', 'estado'])
            }))}
          />
        </label>

        {selectedVisita ? (
          <div className="reception-summary">
            <div>
              <span>Cliente</span>
              <strong>{selectedVisita.cliente_nombre || 'Sin dato'}</strong>
            </div>
            <div>
              <span>Vehiculo</span>
              <strong>{vehicleLabel(selectedVisita)}</strong>
            </div>
            <div>
              <span>Ingreso</span>
              <strong>{formatDate(selectedVisita.fecha_ingreso)}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {!selectedVisitaId ? (
        <EmptyState text="Selecciona una visita para llenar la recepcion" />
      ) : (
        <form className="panel reception-form" onSubmit={submit}>
          {recepcionLoading ? <EmptyState text="Cargando recepcion..." /> : null}
          {formError ? <div className="form-error full-row">{formError}</div> : null}

          <div className="reception-grid">
            <label className="field">
              Nivel de combustible
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.nivel_combustible}
                onChange={(event) => updateField('nivel_combustible', event.target.value)}
              />
            </label>
            <label className="field">
              Nombre de aceptacion
              <input
                maxLength="150"
                value={form.nombre_aceptacion}
                onChange={(event) => updateField('nombre_aceptacion', event.target.value)}
              />
            </label>
          </div>

          <label className="field">
            Trabajo a realizar
            <textarea
              value={form.trabajo_a_realizar}
              onChange={(event) => updateField('trabajo_a_realizar', event.target.value)}
            />
          </label>

          <label className="field">
            Comentarios del cliente
            <textarea
              value={form.comentarios_cliente}
              onChange={(event) => updateField('comentarios_cliente', event.target.value)}
            />
          </label>

          <div className="reception-checklist-grid">
            {checklistSections.map((section) => (
              <section className="reception-checklist" key={section.key}>
                <h3>{section.title}</h3>
                {section.items.map((item) => (
                  <label key={item}>
                    <span>{item}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(form[section.key]?.[item])}
                      onChange={(event) => updateChecklist(section.key, item, event.target.checked)}
                    />
                  </label>
                ))}
              </section>
            ))}
          </div>

          <section className="reception-authorizations">
            <h3>Autorizaciones</h3>
            <label>
              <input
                type="checkbox"
                checked={form.autoriza_presupuesto_previo}
                onChange={(event) => updateField('autoriza_presupuesto_previo', event.target.checked)}
              />
              Solicito presupuesto previo antes de analizar el trabajo
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.autoriza_sin_presupuesto}
                onChange={(event) => updateField('autoriza_sin_presupuesto', event.target.checked)}
              />
              Autorizo calculo aproximado sin presupuesto previo
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.autoriza_pruebas}
                onChange={(event) => updateField('autoriza_pruebas', event.target.checked)}
              />
              Autorizo conducir el vehiculo para pruebas
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.acepta_condiciones}
                onChange={(event) => updateField('acepta_condiciones', event.target.checked)}
              />
              Acepto las condiciones indicadas en esta orden de servicio
            </label>
          </section>

          <label className="field">
            Firma / aceptacion digital
            <textarea
              value={form.firma_cliente}
              onChange={(event) => updateField('firma_cliente', event.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button className="primary-button" type="submit" disabled={saving || recepcionLoading}>
              <Save size={17} aria-hidden="true" />
              {saving ? 'Guardando...' : 'Guardar recepcion'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default RecepcionPage;

