"use client";

import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "tel" | "date" | "number" | "textarea";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  helpText?: string;
  rows?: number;
}

export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  required = false,
  placeholder,
  disabled = false,
  className,
  helpText,
  rows = 3,
}: FormFieldProps) {
  const hasError = !!error;
  const baseInputClasses = cn(
    "w-full rounded-md border bg-white px-3 text-sm text-ink-900 placeholder:text-slateui-400 outline-none transition-colors",
    "focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500",
    hasError && "border-rose-500 focus:border-rose-500 focus:ring-rose-500",
    disabled && "bg-slateui-50 cursor-not-allowed opacity-60",
    type === "textarea" ? "py-2" : "h-10"
  );

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={name} className="block">
        <div className="text-xs font-semibold text-ink-900">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </div>
      </label>

      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          className={baseInputClasses}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : helpText ? `${name}-help` : undefined}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={baseInputClasses}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : helpText ? `${name}-help` : undefined}
        />
      )}

      {error && (
        <p id={`${name}-error`} className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}

      {!error && helpText && (
        <p id={`${name}-help`} className="text-xs text-slateui-600">
          {helpText}
        </p>
      )}
    </div>
  );
}
