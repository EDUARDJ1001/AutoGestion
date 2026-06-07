import { AlertTriangle, RefreshCcw } from 'lucide-react';

function ErrorState({ text, onRetry }) {
  return (
    <div className="error-state">
      <AlertTriangle size={22} aria-hidden="true" />
      <strong>{text}</strong>
      {onRetry ? (
        <button className="secondary-button" type="button" onClick={onRetry}>
          <RefreshCcw size={16} aria-hidden="true" />
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export default ErrorState;
