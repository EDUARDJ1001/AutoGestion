import { AlertTriangle, CheckCircle } from 'lucide-react';

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const Icon = toast.tone === 'danger' ? AlertTriangle : CheckCircle;

  return (
    <button className={`toast toast-${toast.tone || 'success'}`} type="button" onClick={onClose}>
      <Icon size={18} aria-hidden="true" />
      {toast.text}
    </button>
  );
}

export default Toast;
