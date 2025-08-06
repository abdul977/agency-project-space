import { SignJWT } from 'jose';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/lib/auth';

// JWT secret from Supabase project settings
const JWT_SECRET = 'sESCSuGSbq+m0E/2ppOCRTZ1IGm/zQG8e4/bG6QQkl/KBP183B9R4Ul99oRK6lsOtA0fz+kcU+FusKjY7zWO9A==';

// Convert the secret to a Uint8Array for jose
const secretKey = new TextEncoder().encode(JWT_SECRET);

interface SupabaseJWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email?: string;
  phone?: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: {
    full_name?: string;
    company_name?: string;
    is_admin?: boolean;
  };
  role: string;
  aal: string;
  amr: Array<{ method: string; timestamp: number }>;
  session_id: string;
}

/**
 * Generates a JWT token for a user that's compatible with Supabase Auth
 * This allows custom authentication systems to work with Supabase RLS policies
 */
export const generateSupabaseJWT = async (user: User): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (60 * 60); // 1 hour expiration

  const payload: SupabaseJWTPayload = {
    aud: 'authenticated',
    exp,
    iat: now,
    iss: `https://ttcapwgcfadajcoljuuk.supabase.co/auth/v1`,
    sub: user.id,
    email: `${user.phone_number}@placeholder.com`, // Placeholder email since we use phone auth
    phone: user.phone_number,
    app_metadata: {
      provider: 'custom',
      providers: ['custom']
    },
    user_metadata: {
      full_name: user.full_name,
      company_name: user.company_name,
      is_admin: user.is_admin
    },
    role: 'authenticated',
    aal: 'aal1',
    amr: [{ method: 'password', timestamp: now }],
    session_id: `session-${user.id}-${now}`
  };

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secretKey);

  return jwt;
};

/**
 * Sets the authentication session for Supabase client
 * This makes the user authenticated for Supabase services including Storage
 */
export const setSupabaseAuth = async (user: User): Promise<boolean> => {
  try {
    const accessToken = await generateSupabaseJWT(user);
    const refreshToken = `refresh-${user.id}-${Date.now()}`;

    // Set the session on the Supabase client
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      console.error('Error setting Supabase auth session:', error);
      return false;
    }

    console.log('Supabase auth session set successfully');
    return true;
  } catch (error) {
    console.error('Error generating JWT or setting session:', error);
    return false;
  }
};

/**
 * Clears the Supabase authentication session
 */
export const clearSupabaseAuth = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
    console.log('Supabase auth session cleared successfully');
  } catch (error) {
    console.error('Error clearing Supabase auth session:', error);
  }
};



/**
 * Refreshes the Supabase authentication token for a user
 */
export const refreshSupabaseAuth = async (user: User): Promise<boolean> => {
  return await setSupabaseAuth(user);
};
