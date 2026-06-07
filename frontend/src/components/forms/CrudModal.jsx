import { useEffect, useState } from 'react';
import { LoaderCircle, Save, X } from 'lucide-react';
import { getFields, getInitialForm, moduleConfig, normalizePayload } from '../../config/moduleConfig';
import { moduleTitles } from '../../routes/modules';
import { validateField, validateForm } from '../../utils/validation';
import FormField from './FormField';

function CrudModal({ modal, catalogs, saving, error, onClose, onSubmit }) {
  const config = moduleConfig[modal.moduleKey];
  const fields = getFields(config, catalogs, modal.mode);
  const [form, setForm] = useState(() => getInitialForm(config, catalogs, modal.mode, modal.row));
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setForm(getInitialForm(config, catalogs, modal.mode, modal.row));
    setFieldErrors({});
  }, [catalogs, config, modal.mode, modal.row]);

  const title = modal.mode === 'create'
    ? `Nuevo ${moduleTitles[modal.moduleKey].toLowerCase()}`
    : `Editar ${moduleTitles[modal.moduleKey].toLowerCase()}`;

  const submit = (event) => {
    event.preventDefault();
    const errors = validateForm(fields, form, modal.mode);

    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      return;
    }

    onSubmit(normalizePayload(form, fields, modal.mode));
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

        <form className="crud-form" onSubmit={submit} noValidate>
          {fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              mode={modal.mode}
              value={form[field.name] ?? ''}
              error={fieldErrors[field.name]}
              onChange={(value) => {
                setForm((current) => ({ ...current, [field.name]: value }));
                setFieldErrors((current) => ({
                  ...current,
                  [field.name]: validateField(field, value, modal.mode)
                }));
              }}
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

export default CrudModal;
