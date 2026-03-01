import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

// Simple pub/sub for toast notifications without needing a full Context if not desired
const listeners = new Set();
let toasts = [];

export const toast = {
    add: (message, type = 'info', duration = 5000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const toast = { id, message, type };
        toasts = [toast, ...toasts].slice(0, 3); // Max 3 toasts

        listeners.forEach(listener => listener(toasts));

        if (duration) {
            setTimeout(() => {
                toast.dismiss(id);
            }, duration);
        }
        return id;
    },
    success: (msg, duration) => toast.add(msg, 'success', duration),
    error: (msg, duration) => toast.add(msg, 'error', duration),
    warning: (msg, duration) => toast.add(msg, 'warning', duration),
    info: (msg, duration) => toast.add(msg, 'info', duration),
    dismiss: (id) => {
        toasts = toasts.filter(t => t.id !== id);
        listeners.forEach(listener => listener(toasts));
    }
};

export function ToastContainer() {
    const [currentToasts, setCurrentToasts] = useState(toasts);

    useEffect(() => {
        const handleToastsChange = (newToasts) => {
            setCurrentToasts([...newToasts]);
        };
        listeners.add(handleToastsChange);
        return () => listeners.delete(handleToastsChange);
    }, []);

    if (currentToasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm">
            {currentToasts.map((t) => (
                <div
                    key={t.id}
                    className="pointer-events-auto shadow-2xl rounded-lg overflow-hidden border border-forest-700/50 glass-panel flex animate-in slide-in-from-right-8 fade-in duration-300"
                >
                    <div className={`w-1.5 shrink-0 ${t.type === 'error' ? 'bg-alert-500' :
                            t.type === 'success' ? 'bg-forest-400' :
                                t.type === 'warning' ? 'bg-yellow-500' : 'bg-slate-400'
                        }`} />
                    <div className="flex-1 flex items-center p-4 bg-forest-950/90 gap-3">
                        {t.type === 'error' && <AlertTriangle className="h-5 w-5 text-alert-500 shrink-0" />}
                        {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-forest-500 shrink-0" />}
                        {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />}
                        {t.type === 'info' && <Info className="h-5 w-5 text-slate-400 shrink-0" />}

                        <p className="text-sm font-medium text-slate-200 flex-1">{t.message}</p>

                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="shrink-0 text-slate-500 hover:text-slate-200 transition-colors p-1"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
