import { CheckCircle } from 'lucide-react';

function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <button className={`toast toast-${toast.tone || 'success'}`} type="button" onClick={onClose}>
      <CheckCircle size={18} aria-hidden="true" />
      {toast.text}
    </button>
  );
}

export default Toast;
