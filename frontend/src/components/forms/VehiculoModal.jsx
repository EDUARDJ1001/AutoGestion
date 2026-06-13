import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, X } from 'lucide-react';
import { getFields, getInitialForm, moduleConfig, normalizePayload } from '../../config/moduleConfig';
import { apiRequest, assetUrl, crudRequest } from '../../api/client';
import { validateField, validateForm } from '../../utils/validation';
import FormField from './FormField';
import ImageUploader from '../ui/ImageUploader';

function VehiculoModal({ modal, catalogs, token, onClose, onSaved, onRequestError, showToast }) {
  const config = moduleConfig[modal.moduleKey];
  const imageUpload = config.imageUpload;
  const maxFotos = imageUpload?.max || 6;
  const fields = getFields(config, catalogs, modal.mode);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => getInitialForm(config, catalogs, modal.mode, modal.row));
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [vehiculoId, setVehiculoId] = useState(modal.mode === 'edit' ? modal.row.id : null);
  const [existing, setExisting] = useState([]);
  const [images, setImages] = useState([]);

  useEffect(() => {
    setStep(1);
    setForm(getInitialForm(config, catalogs, modal.mode, modal.row));
    setFieldErrors({});
    setError('');
    setImages([]);
    setVehiculoId(modal.mode === 'edit' ? modal.row.id : null);
    setExisting([]);
  }, [catalogs, config, modal.mode, modal.row]);

  const loadFotos = async (id) => {
    try {
      const data = await apiRequest(`/vehiculos/${id}`, { token });
      setExisting(data.fotos || []);
    } catch {
      setExisting([]);
    }
  };

  const remaining = Math.max(maxFotos - existing.length, 0);

  const submitInfo = async (event) => {
    event.preventDefault();
    const errors = validateForm(fields, form, modal.mode);
    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = normalizePayload(form, fields, modal.mode);
      const method = modal.mode === 'create' ? 'POST' : 'PUT';
      const path = modal.mode === 'create' ? config.path : `${config.path}/${modal.row.id}`;
      const result = await crudRequest({ path, token, method, body: payload });
      const id = result?.[imageUpload.resultKey]?.id ?? modal.row.id;

      setVehiculoId(id);
      showToast(modal.mode === 'create' ? 'Vehiculo guardado. Agrega fotos si deseas.' : 'Vehiculo actualizado');
      onSaved();
      await loadFotos(id);
      setStep(2);
    } catch (err) {
      setError(onRequestError(err));
    } finally {
      setSaving(false);
    }
  };

  const finish = () => {
    onSaved();
    onClose();
  };

  const submitFotos = async () => {
    if (!images.length) {
      finish();
      return;
    }

    setSaving(true);
    setError('');
    let uploaded = 0;

    for (const item of images) {
      const formData = new FormData();
      formData.append('foto', item.file);
      formData.append('tipo', imageUpload.tipo || 'Vehículo');
      if (item.descripcion?.trim()) {
        formData.append('descripcion', item.descripcion.trim());
      }

      try {
        await crudRequest({ path: imageUpload.uploadPath(vehiculoId), token, method: 'POST', body: formData });
        uploaded += 1;
      } catch (err) {
        setError(`Se subieron ${uploaded} de ${images.length} fotos: ${onRequestError(err)}`);
        setImages(images.slice(uploaded));
        await loadFotos(vehiculoId);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    showToast(`${uploaded} foto(s) cargada(s)`);
    finish();
  };

  const title = modal.mode === 'create' ? 'Nuevo vehiculo' : 'Editar vehiculo';

  return (
    <div className="modal-layer" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>{title}</h2>
            <span className="modal-step-indicator">Paso {step} de 2 · {step === 1 ? 'Datos' : 'Fotos'}</span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {step === 1 ? (
          <form className="crud-form" onSubmit={submitInfo} noValidate>
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
                {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                Guardar y continuar
              </button>
            </div>
          </form>
        ) : (
          <div className="crud-form vehiculo-fotos-step">
            <div className="vehiculo-fotos-intro">
              <strong>{imageUpload.label || 'Fotos del vehiculo'}</strong>
              <small>{imageUpload.hint}</small>
            </div>

            {existing.length ? (
              <div className="vehiculo-fotos-existentes">
                <span className="image-uploader-label">Fotos actuales ({existing.length}/{maxFotos})</span>
                <div className="image-uploader-items">
                  {existing.map((foto) => (
                    <div className="image-uploader-item" key={foto.id}>
                      <div className="image-uploader-thumb image-uploader-thumb-static">
                        <img src={assetUrl(foto.url_archivo)} alt={foto.descripcion || foto.tipo || 'Foto'} />
                      </div>
                      <p className="vehiculo-foto-desc">{foto.descripcion || 'Sin descripcion'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {remaining > 0 ? (
              <ImageUploader value={images} onChange={setImages} max={remaining} />
            ) : (
              <small className="image-uploader-hint">Este vehiculo ya alcanzo el maximo de {maxFotos} fotos.</small>
            )}

            {error ? <div className="form-error full-row">{error}</div> : null}

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => { setError(''); setStep(1); }} disabled={saving}>
                <ArrowLeft size={18} aria-hidden="true" />
                Volver
              </button>
              <button className="primary-button" type="button" onClick={submitFotos} disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
                {images.length ? `Guardar ${images.length} foto(s)` : 'Finalizar'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default VehiculoModal;
