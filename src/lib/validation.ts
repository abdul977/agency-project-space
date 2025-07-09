// Comprehensive validation utilities

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FieldValidation {
  value: any;
  rules: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'phone' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export class Validator {
  
  // Validate a single field
  static validateField(value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!value || (typeof value === 'string' && !value.trim())) {
            errors.push(rule.message);
          }
          break;
          
        case 'minLength':
          if (typeof value === 'string' && value.length < rule.value) {
            errors.push(rule.message);
          }
          break;
          
        case 'maxLength':
          if (typeof value === 'string' && value.length > rule.value) {
            errors.push(rule.message);
          }
          break;
          
        case 'pattern':
          if (typeof value === 'string' && !rule.value.test(value)) {
            errors.push(rule.message);
          }
          break;
          
        case 'email':
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (typeof value === 'string' && !emailPattern.test(value)) {
            errors.push(rule.message);
          }
          break;
          
        case 'phone':
          const phonePattern = /^\+234[789][01]\d{8}$/;
          if (typeof value === 'string' && !phonePattern.test(value)) {
            errors.push(rule.message);
          }
          break;
          
        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            errors.push(rule.message);
          }
          break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Validate multiple fields
  static validateForm(fields: Record<string, FieldValidation>): ValidationResult {
    const allErrors: string[] = [];
    
    for (const [fieldName, field] of Object.entries(fields)) {
      const result = this.validateField(field.value, field.rules);
      if (!result.isValid) {
        allErrors.push(...result.errors.map(error => `${fieldName}: ${error}`));
      }
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
  
  // Common validation rules
  static rules = {
    required: (message = 'This field is required'): ValidationRule => ({
      type: 'required',
      message
    }),
    
    minLength: (length: number, message?: string): ValidationRule => ({
      type: 'minLength',
      value: length,
      message: message || `Must be at least ${length} characters long`
    }),
    
    maxLength: (length: number, message?: string): ValidationRule => ({
      type: 'maxLength',
      value: length,
      message: message || `Must be no more than ${length} characters long`
    }),
    
    email: (message = 'Please enter a valid email address'): ValidationRule => ({
      type: 'email',
      message
    }),
    
    phone: (message = 'Please enter a valid Nigerian phone number (+234...)'): ValidationRule => ({
      type: 'phone',
      message
    }),
    
    pattern: (regex: RegExp, message: string): ValidationRule => ({
      type: 'pattern',
      value: regex,
      message
    }),
    
    custom: (validator: (value: any) => boolean, message: string): ValidationRule => ({
      type: 'custom',
      validator,
      message
    }),
    
    // Specific validators
    projectName: (): ValidationRule[] => [
      Validator.rules.required('Project name is required'),
      Validator.rules.minLength(2, 'Project name must be at least 2 characters'),
      Validator.rules.maxLength(100, 'Project name must be less than 100 characters'),
      Validator.rules.pattern(
        /^[a-zA-Z0-9\s\-_.,()]+$/,
        'Project name contains invalid characters'
      )
    ],
    
    folderName: (): ValidationRule[] => [
      Validator.rules.required('Folder name is required'),
      Validator.rules.minLength(1, 'Folder name must be at least 1 character'),
      Validator.rules.maxLength(50, 'Folder name must be less than 50 characters'),
      Validator.rules.pattern(
        /^[a-zA-Z0-9\s\-_]+$/,
        'Folder name contains invalid characters'
      )
    ],
    
    fullName: (): ValidationRule[] => [
      Validator.rules.required('Full name is required'),
      Validator.rules.minLength(2, 'Full name must be at least 2 characters'),
      Validator.rules.maxLength(100, 'Full name must be less than 100 characters'),
      Validator.rules.pattern(
        /^[a-zA-Z\s\-']+$/,
        'Full name can only contain letters, spaces, hyphens, and apostrophes'
      )
    ],
    
    companyName: (): ValidationRule[] => [
      Validator.rules.required('Company name is required'),
      Validator.rules.minLength(2, 'Company name must be at least 2 characters'),
      Validator.rules.maxLength(100, 'Company name must be less than 100 characters')
    ],
    
    password: (): ValidationRule[] => [
      Validator.rules.required('Password is required'),
      Validator.rules.minLength(8, 'Password must be at least 8 characters'),
      Validator.rules.custom(
        (value: string) => /[A-Z]/.test(value),
        'Password must contain at least one uppercase letter'
      ),
      Validator.rules.custom(
        (value: string) => /[a-z]/.test(value),
        'Password must contain at least one lowercase letter'
      ),
      Validator.rules.custom(
        (value: string) => /\d/.test(value),
        'Password must contain at least one number'
      ),
      Validator.rules.custom(
        (value: string) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
        'Password must contain at least one special character'
      )
    ],
    
    messageContent: (): ValidationRule[] => [
      Validator.rules.required('Message cannot be empty'),
      Validator.rules.minLength(1, 'Message must contain at least 1 character'),
      Validator.rules.maxLength(1000, 'Message must be less than 1000 characters')
    ],
    
    deliverableTitle: (): ValidationRule[] => [
      Validator.rules.required('Deliverable title is required'),
      Validator.rules.minLength(3, 'Title must be at least 3 characters'),
      Validator.rules.maxLength(100, 'Title must be less than 100 characters')
    ],
    
    url: (): ValidationRule[] => [
      Validator.rules.required('URL is required'),
      Validator.rules.pattern(
        /^https?:\/\/.+\..+/,
        'Please enter a valid URL (http:// or https://)'
      )
    ]
  };
}

// Error boundary for React components
export class ErrorHandler {
  
  // Format error messages for display
  static formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }
    
    return 'An unexpected error occurred';
  }
  
  // Handle API errors
  static handleApiError(error: any): string {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error?.response?.status === 401) {
      return 'Authentication required. Please log in again.';
    }
    
    if (error?.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    
    if (error?.response?.status === 404) {
      return 'The requested resource was not found.';
    }
    
    if (error?.response?.status === 429) {
      return 'Too many requests. Please try again later.';
    }
    
    if (error?.response?.status >= 500) {
      return 'Server error. Please try again later.';
    }
    
    if (error?.code === 'NETWORK_ERROR') {
      return 'Network error. Please check your connection.';
    }
    
    return this.formatError(error);
  }
  
  // Handle form submission errors
  static handleFormError(error: any, fieldName?: string): string {
    const message = this.handleApiError(error);
    
    if (fieldName) {
      return `${fieldName}: ${message}`;
    }
    
    return message;
  }
  
  // Log errors for debugging
  static logError(error: unknown, context?: string): void {
    const errorInfo = {
      message: this.formatError(error),
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('Application Error:', errorInfo);
    
    // In production, send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }
}

export default Validator;
