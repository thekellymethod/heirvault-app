// src/lib/toast.ts
/**
 * Toast notification utilities
 *
 * Centralized toast functions for consistent messaging across the app.
 * IMPORTANT:
 * - Do NOT re-declare these functions in components.
 * - Components should import from "@/lib/toast".
 */

import toast from "react-hot-toast";

// react-hot-toast returns a toast id (string) for success/error/loading
export type ToastId = string,

const DEFAULT_SUCCESS_DURATION_MS = 4000;
const DEFAULT_ERROR_DURATION_MS = 5000;
const DEFAULT_PROMISE_DURATION_MS = 4000;

/** Show a success toast */
export function showSuccess(
  message: string,
  durationMs: number = DEFAULT_SUCCESS_DURATION_MS
): ToastId {
  return toast.success(message, { duration: durationMs });
}

/** Show an error toast */
export function showError(
  message: string,
  durationMs: number = DEFAULT_ERROR_DURATION_MS
): ToastId {
  return toast.error(message, { duration: durationMs });
}

/** Show a loading toast. Returns its toast id. */
export function showLoading(message: string): ToastId {
  return toast.loading(message);
}

/** Dismiss a specific toast (useful for loading toasts) */
export function dismissToast(toastId?: ToastId) {
  toast.dismiss(toastId);
}

/** Dismiss all toasts */
export function dismissAllToasts() {
  toast.dismiss();
}

/**
 * Show a promise toast (loading -> success/error)
 *
 * NOTE:
 * react-hot-toast's `toast.promise(...)` returns the SAME promise you pass in
 * (i.e., Promise<T>), NOT a toast id. That’s why this returns Promise<T>.
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string,
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  },
  options?: { durationMs?: number }
): Promise<T> {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      duration: options?.durationMs ?? DEFAULT_PROMISE_DURATION_MS,
    }
  );
}
