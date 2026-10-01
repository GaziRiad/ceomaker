"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, Close } from "@/components/icons";
import { Check } from "@/components/ui";

interface Toast {
  id: number;
  kind: "ok" | "error";
  text: string;
  action?: { label: string; run: () => void };
}

type Say = (kind: Toast["kind"], text: string, action?: Toast["action"]) => void;

const ToastContext = createContext<Say>(() => {});

/** "Message deleted", "Couldn't reach the server": short confirmations under the header. */
export function useToast(): Say {
  return useContext(ToastContext);
}

export function Toasts({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const say = useCallback<Say>((kind, text, action) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), kind, text, action });
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={say}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-5 top-[112px] z-50 flex justify-end sm:inset-x-10 sm:top-[126px]"
      >
        {toast ? (
          <div
            key={toast.id}
            className="cm-toast pointer-events-auto flex w-full max-w-[420px] items-center gap-3 bg-neutral-900 py-3 pr-3 pl-4 text-neutral-100 shadow-lg"
          >
            <span className={toast.kind === "error" ? "text-danger-soft" : "text-accent-300"}>
              {toast.kind === "error" ? <Alert /> : <Check />}
            </span>
            <span className="flex-1 text-[15px]">{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                className="min-h-10 px-1.5 text-[15px] font-medium text-accent-300"
                onClick={() => {
                  setToast(null);
                  toast.action?.run();
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Dismiss"
              className="flex size-10 items-center justify-center text-neutral-400 hover:text-neutral-100"
              onClick={() => setToast(null)}
            >
              <Close />
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
