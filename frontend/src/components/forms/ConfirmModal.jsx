import { AlertTriangle, LoaderCircle, X } from 'lucide-react';

function ConfirmModal({ confirm, saving, onCancel, onConfirm }) {
  if (!confirm) return null;

  return (
    <div className="modal-layer" role="presentation">
      <section className="modal-panel confirm-panel" role="dialog" aria-modal="true" aria-label={confirm.title}>
        <div className="modal-header">
          <h2>{confirm.title}</h2>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Cerrar" title="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="confirm-content">
          <AlertTriangle size={28} aria-hidden="true" />
          <p>{confirm.message}</p>
        </div>
        <div className="modal-actions confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
          <button className="primary-button" type="button" onClick={onConfirm} disabled={saving}>
            {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : null}
            Confirmar
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmModal;
