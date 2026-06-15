import React, { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmContext = createContext({ confirm: async () => false });

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // {title, message, confirmText, resolve}

  const confirm = useCallback(({ title = "Επιβεβαίωση", message, confirmText = "Διαγραφή", cancelText = "Άκυρο", danger = true } = {}) => {
    return new Promise((resolve) => {
      setState({ title, message, confirmText, cancelText, danger, resolve });
    });
  }, []);

  const handle = (val) => {
    state?.resolve(val);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
          onClick={() => handle(false)}
          data-testid="confirm-overlay"
        >
          <div
            className="bg-white max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="confirm-dialog"
          >
            <div className="flex items-start justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {state.danger && (
                  <div className="w-10 h-10 bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                )}
                <h3 className="font-serif-display text-xl text-slate-900">{state.title}</h3>
              </div>
              <button onClick={() => handle(false)} data-testid="confirm-close">
                <X size={18} className="text-slate-500 hover:text-slate-900" />
              </button>
            </div>
            <div className="p-6 text-sm text-slate-700">{state.message}</div>
            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button
                onClick={() => handle(false)}
                data-testid="confirm-cancel"
                className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs uppercase tracking-[0.2em] font-semibold hover:bg-slate-50"
              >
                {state.cancelText}
              </button>
              <button
                onClick={() => handle(true)}
                data-testid="confirm-accept"
                autoFocus
                className={`px-5 py-2.5 text-white text-xs uppercase tracking-[0.2em] font-semibold ${state.danger ? "bg-red-600 hover:bg-red-700" : "bg-[#1E3A8A] hover:bg-[#1E40AF]"}`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext).confirm;
