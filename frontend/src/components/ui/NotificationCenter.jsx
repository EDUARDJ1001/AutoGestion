import { Bell, CheckCheck, RefreshCcw, X } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

function NotificationCenter({
  open,
  loading,
  count,
  notifications,
  onToggle,
  onClose,
  onRefresh,
  onRead,
  onReadAll
}) {
  return (
    <div className="notification-shell no-print">
      <button className="icon-button notification-button" type="button" onClick={onToggle} aria-label="Notificaciones">
        <Bell size={19} aria-hidden="true" />
        {count > 0 ? <span>{count > 99 ? '99+' : count}</span> : null}
      </button>

      {open ? (
        <section className="notification-panel" aria-label="Centro de notificaciones">
          <div className="notification-header">
            <div>
              <strong>Notificaciones</strong>
              <span>{count} sin leer</span>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar notificaciones">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="notification-actions">
            <button className="secondary-button" type="button" onClick={onRefresh} disabled={loading}>
              <RefreshCcw size={16} aria-hidden="true" />
              Actualizar
            </button>
            <button className="secondary-button" type="button" onClick={onReadAll} disabled={!count || loading}>
              <CheckCheck size={16} aria-hidden="true" />
              Leer todas
            </button>
          </div>

          <div className="notification-list">
            {loading ? <div className="compact-empty">Cargando notificaciones...</div> : null}
            {!loading && notifications.length ? notifications.map((item) => (
              <article className={`notification-item notification-${item.severidad} ${item.leida ? 'notification-read' : ''}`} key={item.id}>
                <div>
                  <strong>{item.titulo}</strong>
                  <p>{item.mensaje}</p>
                  <span>{formatDate(item.fecha_creacion)}</span>
                </div>
                {!item.leida ? (
                  <button type="button" onClick={() => onRead(item.id)}>
                    Leida
                  </button>
                ) : null}
              </article>
            )) : null}
            {!loading && !notifications.length ? <div className="compact-empty">Sin notificaciones activas</div> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default NotificationCenter;
