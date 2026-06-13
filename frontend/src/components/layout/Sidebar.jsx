import { LogOut, ShieldCheck, X } from 'lucide-react';
import logoImage from '../../assets/logo.svg';

function Sidebar({ items, activeModule, onSelect, user, onLogout, open, onClose }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="app-lockup">
            <span className="app-icon app-icon-logo">
              <img src={logoImage} alt="Miguel Expert Collision" />
            </span>
            <div>
              <strong>Miguel Expert Collision</strong>
              <small>Taller Automotriz</small>
            </div>
          </div>
          <button className="icon-button mobile-only" type="button" onClick={onClose} aria-label="Cerrar menu">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="nav-list" aria-label="Modulos">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activeModule === item.key ? 'nav-item nav-item-active' : 'nav-item'}
                type="button"
                onClick={() => {
                  onSelect(item.key);
                  onClose();
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="user-box">
          <div className="user-avatar">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div>
            <strong>{user?.nombre || user?.username}</strong>
            <small>{user?.rol}</small>
          </div>
          <button className="icon-button" type="button" onClick={onLogout} aria-label="Cerrar sesion">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>
      <button className={`scrim ${open ? 'scrim-visible' : ''}`} type="button" onClick={onClose} aria-label="Cerrar menu" />
    </>
  );
}

export default Sidebar;
