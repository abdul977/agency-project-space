import bcrypt from 'bcryptjs';
import { supabase } from '@/integrations/supabase/client';
import SecurityManager from '@/lib/security';

export interface User {
  id: string;
  phone_number: string;
  full_name?: string;
  company_name?: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface LoginCredentials {
  phone_number: string;
  password: string;
}

export interface SignupCredentials {
  phone_number: string;
  password: string;
  full_name?: string;
  company_name?: string;
}

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Verify password
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Format phone number (ensure it starts with +)
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it doesn't start with country code, assume it's Nigerian (+234)
  if (!cleaned.startsWith('234') && cleaned.length === 11) {
    return `+234${cleaned.substring(1)}`;
  }
  
  // If it already has country code
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  
  // If it starts with +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default case
  return `+${cleaned}`;
};

// Validate phone number
export const validatePhoneNumber = (phone: string): boolean => {
  const formatted = formatPhoneNumber(phone);
  // Nigerian phone number validation: +234 followed by 10 digits
  const nigerianPhoneRegex = /^\+234[789][01]\d{8}$/;
  return nigerianPhoneRegex.test(formatted);
};

// Validate password strength
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Sign up new user
export const signUp = async (credentials: SignupCredentials): Promise<AuthResponse> => {
  try {
    const { phone_number, password, full_name, company_name } = credentials;

    // Sanitize inputs
    const sanitizedPhone = SecurityManager.sanitizeInput(phone_number);
    const sanitizedFullName = full_name ? SecurityManager.sanitizeInput(full_name) : undefined;
    const sanitizedCompanyName = company_name ? SecurityManager.sanitizeInput(company_name) : undefined;

    // Validate phone number
    const formattedPhone = formatPhoneNumber(sanitizedPhone);
    if (!validatePhoneNumber(formattedPhone)) {
      await SecurityManager.logSecurityEvent('anonymous', 'signup_invalid_phone', { phone: sanitizedPhone });
      return { success: false, error: 'Invalid phone number format' };
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      await SecurityManager.logSecurityEvent('anonymous', 'signup_weak_password', { phone: formattedPhone });
      return { success: false, error: passwordValidation.errors.join(', ') };
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', formattedPhone)
      .single();
    
    if (existingUser) {
      return { success: false, error: 'User with this phone number already exists' };
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        phone_number: formattedPhone,
        password_hash: hashedPassword,
        full_name: sanitizedFullName,
        company_name: sanitizedCompanyName,
        is_admin: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Signup error:', error);
      await SecurityManager.logSecurityEvent('anonymous', 'signup_failed', { phone: formattedPhone, error: error.message });
      return { success: false, error: 'Failed to create account' };
    }

    await SecurityManager.logSecurityEvent(user.id, 'signup_success', { phone: formattedPhone });
    return { success: true, user };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

// Sign in user
export const signIn = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const { phone_number, password } = credentials;

    // Sanitize and format phone number
    const sanitizedPhone = SecurityManager.sanitizeInput(phone_number);
    const formattedPhone = formatPhoneNumber(sanitizedPhone);
    
    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', formattedPhone)
      .single();
    
    if (error || !user) {
      await SecurityManager.logSecurityEvent('anonymous', 'signin_user_not_found', { phone: formattedPhone });
      return { success: false, error: 'Invalid phone number or password' };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await SecurityManager.logSecurityEvent(user.id, 'signin_invalid_password', { phone: formattedPhone });
      return { success: false, error: 'Invalid phone number or password' };
    }
    
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    await SecurityManager.logSecurityEvent(user.id, 'signin_success', { phone: formattedPhone });
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Signin error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

// Update user profile
export const updateProfile = async (userId: string, updates: Partial<Pick<User, 'full_name' | 'company_name'>>): Promise<AuthResponse> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<AuthResponse> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      return { success: false, error: 'User not found' };
    }
    
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;
    
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Get user error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};
