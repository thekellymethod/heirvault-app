/**
 * Form validation rules and utilities
 */

export interface ValidationRule<T = string> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Sanitize string input - remove leading/trailing whitespace and normalize
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Sanitize email - lowercase and trim
 */
export function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Sanitize phone number - remove non-digit characters except + at start
 */
export function sanitizePhone(value: string): string {
  const cleaned = value.trim();
  if (cleaned.startsWith("+")) {
    return "+" + cleaned.slice(1).replace(/\D/g, "");
  }
  return cleaned.replace(/\D/g, "");
}

/**
 * Validation rules
 */
export const rules = {
  required: (fieldName: string = "This field"): ValidationRule => ({
    validate: (value: string) => value.trim().length > 0,
    message: `${fieldName} is required`,
  }),

  minLength: (min: number, fieldName: string = "This field"): ValidationRule => ({
    validate: (value: string) => value.trim().length >= min,
    message: `${fieldName} must be at least ${min} characters`,
  }),

  maxLength: (max: number, fieldName: string = "This field"): ValidationRule => ({
    validate: (value: string) => value.length <= max,
    message: `${fieldName} must be no more than ${max} characters`,
  }),

  email: (): ValidationRule => ({
    validate: (value: string) => {
      if (!value.trim()) return true; // Optional fields can be empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value.trim());
    },
    message: "Please enter a valid email address",
  }),

  phone: (): ValidationRule => ({
    validate: (value: string) => {
      if (!value.trim()) return true; // Optional fields can be empty
      // Allow formats: +1234567890, (123) 456-7890, 123-456-7890, 1234567890
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
      return phoneRegex.test(sanitizePhone(value));
    },
    message: "Please enter a valid phone number",
  }),

  name: (fieldName: string = "Name"): ValidationRule => ({
    validate: (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return false;
      // Allow letters, spaces, hyphens, apostrophes
      const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
      return nameRegex.test(trimmed);
    },
    message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`,
  }),

  date: (fieldName: string = "Date"): ValidationRule => ({
    validate: (value: string) => {
      if (!value.trim()) return true; // Optional fields can be empty
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    message: `Please enter a valid ${fieldName.toLowerCase()}`,
  }),

  dateNotFuture: (fieldName: string = "Date"): ValidationRule => ({
    validate: (value: string) => {
      if (!value.trim()) return true; // Optional fields can be empty
      const date = new Date(value);
      if (isNaN(date.getTime())) return false;
      return date <= new Date();
    },
    message: `${fieldName} cannot be in the future`,
  }),

  dateNotPast: (fieldName: string = "Date"): ValidationRule => ({
    validate: (value: string) => {
      if (!value.trim()) return true; // Optional fields can be empty
      const date = new Date(value);
      if (isNaN(date.getTime())) return false;
      return date >= new Date();
    },
    message: `${fieldName} cannot be in the past`,
  }),

  alphanumeric: (fieldName: string = "This field"): ValidationRule => ({
    validate: (value: string) => {
      if (!value.trim()) return true; // Optional fields can be empty
      const alphanumericRegex = /^[a-zA-Z0-9\s\-_]+$/;
      return alphanumericRegex.test(value.trim());
    },
    message: `${fieldName} can only contain letters, numbers, spaces, hyphens, and underscores`,
  }),
};

/**
 * Validate a value against multiple rules
 */
export function validate(
  value: string,
  rulesToApply: ValidationRule[],
  isRequired: boolean = true
): ValidationResult {
  const errors: string[] = [];

  // Check if required
  if (isRequired && !value.trim()) {
    const requiredRule = rulesToApply.find((r) => r.message.includes("required"));
    if (requiredRule) {
      errors.push(requiredRule.message);
      return { isValid: false, errors };
    }
  }

  // Apply all rules
  for (const rule of rulesToApply) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string, isRequired: boolean = true): ValidationResult {
  return validate(email, [rules.email()], isRequired);
}

/**
 * Validate phone format
 */
export function validatePhone(phone: string, isRequired: boolean = false): ValidationResult {
  return validate(phone, [rules.phone()], isRequired);
}

/**
 * Validate name (first or last)
 */
export function validateName(name: string, fieldName: string, isRequired: boolean = true): ValidationResult {
  return validate(name, [rules.required(fieldName), rules.name(fieldName), rules.maxLength(100, fieldName)], isRequired);
}

/**
 * Validate date
 */
export function validateDate(date: string, fieldName: string, isRequired: boolean = false): ValidationResult {
  return validate(date, [rules.date(fieldName)], isRequired);
}

/**
 * Validate date of birth (not in future)
 */
export function validateDateOfBirth(date: string, isRequired: boolean = false): ValidationResult {
  if (!date.trim() && !isRequired) {
    return { isValid: true, errors: [] };
  }
  const dateResult = validateDate(date, "Date of birth", isRequired);
  if (!dateResult.isValid) return dateResult;
  
  const futureResult = validate(date, [rules.dateNotFuture("Date of birth")], isRequired);
  return {
    isValid: dateResult.isValid && futureResult.isValid,
    errors: [...dateResult.errors, ...futureResult.errors],
  };
}
