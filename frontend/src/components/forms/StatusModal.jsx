import { LoaderCircle, Save, X } from 'lucide-react';
import { estadosVisita } from '../../constants/app';

function StatusModal({ statusModal, saving, onChange, onClose, onSubmit }) {
  return (
    <div className="modal-layer" role="presentation">
      <section className="modal-panel status-panel" role="dialog" aria-modal="true" aria-label="Cambiar estado">
        <div className="modal-header">
          <h2>Cambiar estado</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar">
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

export default StatusModal;
