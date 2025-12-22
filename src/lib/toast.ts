/**
 * Toast notification utilities
 * 
 * Centralized toast functions for consistent messaging across the app
 */

import toast from "react-hot-toast";

/**
 * Show success toast
 */
export function showSuccess(message: string) {
  toast.success(message, {
    duration: 4000,
  });
}

/**
 * Show error toast
 */
export function showError(message: string) {
  toast.error(message, {
    duration: 5000,
  });
}

/**
 * Show loading toast (returns a function to update/dismiss)
 */
export function showLoading(message: string) {
  return toast.loading(message);
}

/**
 * Show promise toast (handles loading, success, and error states)
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      duration: 4000,
    }
  );
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId: string) {
  toast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss();
}

