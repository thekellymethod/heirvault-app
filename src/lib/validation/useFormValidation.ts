"use client";

import { useState, useCallback } from "react";
import { ValidationResult, validate, sanitizeString, sanitizeEmail, sanitizePhone } from "./rules";

export interface FieldValidation {
  value: string;
  error: string | null;
  touched: boolean;
}

export interface FormValidationState {
  [fieldName: string]: FieldValidation;
}

export interface UseFormValidationOptions {
  initialValues: Record<string, string>;
  validationRules: Record<string, Array<{ validate: (value: string) => boolean; message: string }>>;
  sanitizers?: Record<string, (value: string) => string>;
}

export interface UseFormValidationReturn {
  fields: FormValidationState;
  setFieldValue: (fieldName: string, value: string) => void;
  setFieldTouched: (fieldName: string) => void;
  validateField: (fieldName: string) => ValidationResult;
  validateForm: () => boolean;
  getFieldError: (fieldName: string) => string | null;
  isFieldValid: (fieldName: string) => boolean;
  resetForm: () => void;
  getFormValues: () => Record<string, string>;
}

/**
 * Hook for form validation with sanitization
 */
export function useFormValidation({
  initialValues,
  validationRules,
  sanitizers = {},
}: UseFormValidationOptions): UseFormValidationReturn {
  // Initialize fields state
  const [fields, setFields] = useState<FormValidationState>(() => {
    const state: FormValidationState = {};
    for (const key in initialValues) {
      state[key] = {
        value: initialValues[key] || "",
        error: null,
        touched: false,
      };
    }
    return state;
  });

  // Default sanitizers
  const defaultSanitizers: Record<string, (value: string) => string> = {
    email: sanitizeEmail,
    phone: sanitizePhone,
    default: sanitizeString,
  };

  const getSanitizer = (fieldName: string): ((value: string) => string) => {
    return sanitizers[fieldName] || defaultSanitizers[fieldName] || defaultSanitizers.default;
  };

  // Set field value with sanitization
  const setFieldValue = useCallback((fieldName: string, value: string) => {
    const sanitizer = getSanitizer(fieldName);
    const sanitized = sanitizer(value);

    setFields((prev) => {
      const field = prev[fieldName];
      if (!field) return prev;

      const newField = {
        ...field,
        value: sanitized,
        // Clear error if field is being edited
        error: field.touched ? (prev[fieldName]?.error || null) : null,
      };

      return {
        ...prev,
        [fieldName]: newField,
      };
    });
  }, [sanitizers]);

  // Mark field as touched
  const setFieldTouched = useCallback((fieldName: string) => {
    setFields((prev) => {
      const field = prev[fieldName];
      if (!field || field.touched) return prev;

      return {
        ...prev,
        [fieldName]: {
          ...field,
          touched: true,
        },
      };
    });
  }, []);

  // Validate a single field
  const validateField = useCallback((fieldName: string): ValidationResult => {
    const field = fields[fieldName];
    if (!field) {
      return { isValid: true, errors: [] };
    }

    const rules = validationRules[fieldName] || [];
    if (rules.length === 0) {
      return { isValid: true, errors: [] };
    }

    const result = validate(field.value, rules, true);
    
    // Update field error state
    setFields((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        error: result.isValid ? null : result.errors[0] || null,
        touched: true,
      },
    }));

    return result;
  }, [fields, validationRules]);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    let isValid = true;

    for (const fieldName in validationRules) {
      const result = validateField(fieldName);
      if (!result.isValid) {
        isValid = false;
      }
    }

    return isValid;
  }, [validateField, validationRules]);

  // Get field error
  const getFieldError = useCallback((fieldName: string): string | null => {
    return fields[fieldName]?.error || null;
  }, [fields]);

  // Check if field is valid
  const isFieldValid = useCallback((fieldName: string): boolean => {
    const field = fields[fieldName];
    if (!field) return true;
    return !field.error && field.touched;
  }, [fields]);

  // Reset form
  const resetForm = useCallback(() => {
    setFields((prev) => {
      const reset: FormValidationState = {};
      for (const key in prev) {
        reset[key] = {
          value: initialValues[key] || "",
          error: null,
          touched: false,
        };
      }
      return reset;
    });
  }, [initialValues]);

  // Get form values
  const getFormValues = useCallback((): Record<string, string> => {
    const values: Record<string, string> = {};
    for (const key in fields) {
      values[key] = fields[key].value;
    }
    return values;
  }, [fields]);

  return {
    fields,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateForm,
    getFieldError,
    isFieldValid,
    resetForm,
    getFormValues,
  };
}
