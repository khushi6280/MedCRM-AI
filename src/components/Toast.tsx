import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { clearToast } from '../store/slices/uiSlice';

export default function Toast() {
  const toast = useAppSelector((s) => s.ui.toast);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => dispatch(clearToast()), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  const config = {
    success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    error: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  };

  const { icon: Icon, color, bg, border } = config[toast.type];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className={`flex items-center gap-3 px-4 py-3 ${bg} border ${border} rounded-xl shadow-lg max-w-md`}>
        <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
        <p className="text-sm font-medium text-slate-800">{toast.message}</p>
        <button
          onClick={() => dispatch(clearToast())}
          className="ml-2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
