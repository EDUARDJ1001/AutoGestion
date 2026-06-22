import { X } from 'lucide-react';
import { assetUrl } from '../../api/client';
import { formatDate } from '../../utils/formatters';

function PhotoGalleryModal({ gallery, onClose }) {
  if (!gallery) return null;

  const fotos = gallery.fotos || [];

  return (
    <div className="modal-layer" role="presentation" onClick={onClose}>
      <section
        className="modal-panel photo-gallery-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Fotos de avance"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>Fotos de avance</h2>
            <span className="modal-step-indicator">{gallery.title}</span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="photo-gallery-body">
          {fotos.length ? (
            <div className="photo-gallery-grid">
              {fotos.map((foto) => (
                <figure className="photo-gallery-item" key={foto.id}>
                  <a href={assetUrl(foto.url_archivo)} target="_blank" rel="noreferrer">
                    <img src={assetUrl(foto.url_archivo)} alt={foto.descripcion || 'Foto de avance'} />
                  </a>
                  <figcaption>
                    <strong>{foto.etapa_nombre || 'Sin etapa'}</strong>
                    {foto.descripcion ? <span>{foto.descripcion}</span> : null}
                    <small>{formatDate(foto.fecha_creacion)}</small>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="compact-empty">Sin fotos de avance registradas.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default PhotoGalleryModal;
