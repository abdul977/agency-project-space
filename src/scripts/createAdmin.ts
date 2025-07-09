// Script to create an admin user
// Run this in the browser console or as a one-time setup

import { supabase } from '../integrations/supabase/client';
import { hashPassword } from '../lib/auth';

export const createAdminUser = async () => {
  try {
    // Admin credentials
    const adminData = {
      phone_number: '+2348012345678',
      password: 'Admin123!',
      full_name: 'System Administrator',
      company_name: 'Muahib Solution',
      is_admin: true
    };

    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', adminData.phone_number)
      .single();

    if (existingAdmin) {
      console.log('Admin user already exists');
      return { success: true, message: 'Admin user already exists' };
    }

    // Hash password
    const hashedPassword = await hashPassword(adminData.password);

    // Create admin user
    const { data: admin, error } = await supabase
      .from('users')
      .insert({
        phone_number: adminData.phone_number,
        password_hash: hashedPassword,
        full_name: adminData.full_name,
        company_name: adminData.company_name,
        is_admin: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating admin user:', error);
      return { success: false, error: error.message };
    }

    console.log('Admin user created successfully:', admin);
    return { 
      success: true, 
      message: 'Admin user created successfully',
      credentials: {
        phone: adminData.phone_number,
        password: adminData.password
      }
    };

  } catch (error) {
    console.error('Error creating admin user:', error);
    return { success: false, error: 'Failed to create admin user' };
  }
};

// Uncomment the line below to run this script
// createAdminUser().then(result => console.log(result));
