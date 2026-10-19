import { useNotifications } from '../context/NotificationContext';

export default function Toasts() {
  const { toasts, dismissToast } = useNotifications();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismissToast(t.id)} role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}
