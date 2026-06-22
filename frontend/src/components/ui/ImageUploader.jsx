import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { validateImageFile } from '../../utils/validation';

// value: array de { file, descripcion }
function ImageUploader({ value = [], onChange, max = 6 }) {
  const [error, setError] = useState('');

  const previews = useMemo(
    () => value.map((item) => ({ ...item, url: URL.createObjectURL(item.file) })),
    [value]
  );

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const handleSelect = (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';

    if (!incoming.length) return;

    let nextError = '';
    const accepted = [];

    for (const file of incoming) {
      const validationError = validateImageFile(file);

      if (validationError) {
        nextError = validationError;
        continue;
      }

      accepted.push({ file, descripcion: '' });
    }

    const room = max - value.length;

    if (accepted.length > room) {
      nextError = `Solo puedes agregar ${max} imagen(es) en total`;
    }

    setError(nextError);

    if (room <= 0) return;

    onChange([...value, ...accepted.slice(0, room)]);
  };

  const updateDescripcion = (index, descripcion) => {
    onChange(value.map((item, position) => (position === index ? { ...item, descripcion } : item)));
  };

  const removeAt = (index) => {
    setError('');
    onChange(value.filter((_, position) => position !== index));
  };

  const full = value.length >= max;

  return (
    <div className="image-uploader">
      <div className="image-uploader-items">
        {previews.map((preview, index) => (
          <div className="image-uploader-item" key={preview.url}>
            <div className="image-uploader-thumb">
              <img src={preview.url} alt={preview.file.name} />
              <button type="button" onClick={() => removeAt(index)} aria-label="Quitar imagen" title="Quitar imagen">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Descripcion (opcional)"
              maxLength={255}
              value={preview.descripcion}
              onChange={(event) => updateDescripcion(index, event.target.value)}
            />
          </div>
        ))}

        {!full ? (
          <label className="image-uploader-add">
            <ImagePlus size={24} aria-hidden="true" />
            <span>Agregar</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleSelect}
            />
          </label>
        ) : null}
      </div>

      {full ? <small className="image-uploader-hint">Maximo de imagenes alcanzado.</small> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

export default ImageUploader;
