import React, { useState, useCallback, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (msg: string, type?: ToastType) => void;
}

// Simple module-level event system (no React context needed)
let _toastFn: ((msg: string, type: ToastType) => void) | null = null;

export function toast(msg: string, type: ToastType = "success") {
  if (_toastFn) _toastFn(msg, type);
  else console.log(`[Toast ${type}]`, msg);
}

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />,
  error: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
};

const BG = {
  success: "bg-white border-green-200",
  error: "bg-white border-red-200",
  warning: "bg-white border-amber-200",
  info: "bg-white border-blue-200",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, type, message: msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    _toastFn = addToast;
    return () => { _toastFn = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium text-gray-800 ${BG[t.type]} pointer-events-auto animate-in slide-in-from-bottom-2 duration-200`}>
          {ICONS[t.type]}
          <span className="flex-1 leading-relaxed">{t.message}</span>
          <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
            className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
