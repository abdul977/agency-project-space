import { useState, useCallback } from 'react';
import { Validator, ValidationResult, FieldValidation } from '@/lib/validation';

interface UseValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export const useValidation = (options: UseValidationOptions = {}) => {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Validate a single field
  const validateField = useCallback((
    fieldName: string, 
    value: any, 
    rules: any[]
  ): ValidationResult => {
    const result = Validator.validateField(value, rules);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.errors
    }));
    
    return result;
  }, []);

  // Validate entire form
  const validateForm = useCallback((
    fields: Record<string, FieldValidation>
  ): ValidationResult => {
    setIsValidating(true);
    
    const result = Validator.validateForm(fields);
    
    // Update errors for each field
    const newErrors: Record<string, string[]> = {};
    
    for (const [fieldName, field] of Object.entries(fields)) {
      const fieldResult = Validator.validateField(field.value, field.rules);
      newErrors[fieldName] = fieldResult.errors;
    }
    
    setErrors(newErrors);
    setIsValidating(false);
    
    return result;
  }, []);

  // Clear errors for a specific field
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: []
    }));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Get errors for a specific field
  const getFieldErrors = useCallback((fieldName: string): string[] => {
    return errors[fieldName] || [];
  }, [errors]);

  // Check if a field has errors
  const hasFieldError = useCallback((fieldName: string): boolean => {
    return (errors[fieldName] || []).length > 0;
  }, [errors]);

  // Check if form has any errors
  const hasErrors = useCallback((): boolean => {
    return Object.values(errors).some(fieldErrors => fieldErrors.length > 0);
  }, [errors]);

  // Get first error for a field
  const getFirstFieldError = useCallback((fieldName: string): string | null => {
    const fieldErrors = errors[fieldName] || [];
    return fieldErrors.length > 0 ? fieldErrors[0] : null;
  }, [errors]);

  // Create field props for form inputs
  const getFieldProps = useCallback((
    fieldName: string,
    value: any,
    rules: any[],
    onChange: (value: any) => void
  ) => {
    return {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        
        if (options.validateOnChange) {
          validateField(fieldName, newValue, rules);
        }
      },
      onBlur: () => {
        if (options.validateOnBlur) {
          validateField(fieldName, value, rules);
        }
      },
      error: hasFieldError(fieldName),
      helperText: getFirstFieldError(fieldName)
    };
  }, [options, validateField, hasFieldError, getFirstFieldError]);

  return {
    errors,
    isValidating,
    validateField,
    validateForm,
    clearFieldError,
    clearAllErrors,
    getFieldErrors,
    hasFieldError,
    hasErrors,
    getFirstFieldError,
    getFieldProps
  };
};
