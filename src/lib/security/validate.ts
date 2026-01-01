/**
 * Input Validation Utilities
 * Validates data types, formats, and constraints
 */

import { sanitizeString, sanitizeEmail, sanitizePhone, validateLength } from "./sanitize";

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate required field
 */
export function validateRequired(
  value: unknown,
  fieldName: string
): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return {
      valid: false,
      errors: [`${fieldName} is required`],
    };
  }
  
  if (typeof value === "string" && value.trim() === "") {
    return {
      valid: false,
      errors: [`${fieldName} cannot be empty`],
    };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Validate string field
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    required?: boolean;
  }
): ValidationResult {
  const errors: string[] = [];
  
  if (options?.required) {
    const requiredResult = validateRequired(value, fieldName);
    if (!requiredResult.valid) {
      return requiredResult;
    }
  }
  
  if (value === null || value === undefined || value === "") {
    return { valid: !options?.required, errors };
  }
  
  if (typeof value !== "string") {
    return {
      valid: false,
      errors: [`${fieldName} must be a string`],
    };
  }
  
  const sanitized = sanitizeString(value);
  
  if (options?.minLength && sanitized.length < options.minLength) {
    errors.push(`${fieldName} must be at least ${options.minLength} characters`);
  }
  
  if (options?.maxLength && sanitized.length > options.maxLength) {
    errors.push(`${fieldName} must be no more than ${options.maxLength} characters`);
  }
  
  if (options?.pattern && !options.pattern.test(sanitized)) {
    errors.push(`${fieldName} format is invalid`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email address
 */
export function validateEmail(
  value: unknown,
  fieldName: string = "Email",
  required: boolean = true
): ValidationResult {
  if (required) {
    const requiredResult = validateRequired(value, fieldName);
    if (!requiredResult.valid) {
      return requiredResult;
    }
  }
  
  if (value === null || value === undefined || value === "") {
    return { valid: !required, errors: [] };
  }
  
  const sanitized = sanitizeEmail(value as string);
  
  if (!sanitized) {
    return {
      valid: false,
      errors: [`${fieldName} is invalid`],
    };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Validate phone number
 */
export function validatePhone(
  value: unknown,
  fieldName: string = "Phone",
  required: boolean = false
): ValidationResult {
  if (required) {
    const requiredResult = validateRequired(value, fieldName);
    if (!requiredResult.valid) {
      return requiredResult;
    }
  }
  
  if (value === null || value === undefined || value === "") {
    return { valid: !required, errors: [] };
  }
  
  const sanitized = sanitizePhone(value as string);
  
  if (!sanitized) {
    return {
      valid: false,
      errors: [`${fieldName} is invalid`],
    };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Validate date
 */
export function validateDate(
  value: unknown,
  fieldName: string = "Date",
  options?: {
    required?: boolean;
    min?: Date;
    max?: Date;
  }
): ValidationResult {
  if (options?.required) {
    const requiredResult = validateRequired(value, fieldName);
    if (!requiredResult.valid) {
      return requiredResult;
    }
  }
  
  if (value === null || value === undefined || value === "") {
    return { valid: !options?.required, errors: [] };
  }
  
  const date = value instanceof Date ? value : new Date(value as string);
  
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      errors: [`${fieldName} is not a valid date`],
    };
  }
  
  const errors: string[] = [];
  
  if (options?.min && date < options.min) {
    errors.push(`${fieldName} must be after ${options.min.toISOString()}`);
  }
  
  if (options?.max && date > options.max) {
    errors.push(`${fieldName} must be before ${options.max.toISOString()}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate number
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options?: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  }
): ValidationResult {
  if (options?.required) {
    const requiredResult = validateRequired(value, fieldName);
    if (!requiredResult.valid) {
      return requiredResult;
    }
  }
  
  if (value === null || value === undefined || value === "") {
    return { valid: !options?.required, errors: [] };
  }
  
  const num = typeof value === "number" ? value : Number(value);
  
  if (isNaN(num)) {
    return {
      valid: false,
      errors: [`${fieldName} must be a number`],
    };
  }
  
  const errors: string[] = [];
  
  if (options?.integer && !Number.isInteger(num)) {
    errors.push(`${fieldName} must be an integer`);
  }
  
  if (options?.min !== undefined && num < options.min) {
    errors.push(`${fieldName} must be at least ${options.min}`);
  }
  
  if (options?.max !== undefined && num > options.max) {
    errors.push(`${fieldName} must be no more than ${options.max}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
  required: boolean = true
): ValidationResult {
  if (required) {
    const requiredResult = validateRequired(value, fieldName);
    if (!requiredResult.valid) {
      return requiredResult;
    }
  }
  
  if (value === null || value === undefined || value === "") {
    return { valid: !required, errors: [] };
  }
  
  if (!allowedValues.includes(value as T)) {
    return {
      valid: false,
      errors: [
        `${fieldName} must be one of: ${allowedValues.join(", ")}`,
      ],
    };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Validate multiple fields and return combined result
 */
export function validateFields(
  validations: ValidationResult[]
): ValidationResult {
  const errors = validations.flatMap((v) => v.errors);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
