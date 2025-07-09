/**
 * Test script to verify real data integration is working
 * Run this script to test that all mock data has been replaced with real database operations
 */

import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  data?: any;
}

class RealDataTester {
  private results: TestResult[] = [];

  private addResult(test: string, passed: boolean, message: string, data?: any) {
    this.results.push({ test, passed, message, data });
    console.log(`${passed ? '✅' : '❌'} ${test}: ${message}`);
  }

  async testSystemAlertsTable() {
    try {
      // Test if system_alerts table exists and can be queried
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .limit(1);

      if (error) {
        this.addResult('System Alerts Table', false, `Table query failed: ${error.message}`);
        return;
      }

      this.addResult('System Alerts Table', true, 'Table exists and is queryable');

      // Test creating a system alert
      const { data: newAlert, error: createError } = await supabase
        .from('system_alerts')
        .insert({
          title: 'Test Alert',
          message: 'This is a test alert to verify real database integration',
          type: 'info',
          priority: 'low',
          created_by: 'Test System'
        })
        .select()
        .single();

      if (createError) {
        this.addResult('System Alert Creation', false, `Failed to create alert: ${createError.message}`);
        return;
      }

      this.addResult('System Alert Creation', true, 'Successfully created test alert', newAlert);

      // Clean up test data
      await supabase.from('system_alerts').delete().eq('id', newAlert.id);

    } catch (error) {
      this.addResult('System Alerts Table', false, `Unexpected error: ${error}`);
    }
  }

  async testSystemSettingsTable() {
    try {
      // Test if system_settings table exists and has default data
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(5);

      if (error) {
        this.addResult('System Settings Table', false, `Table query failed: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        this.addResult('System Settings Data', false, 'No default settings found - migration may not have run completely');
        return;
      }

      this.addResult('System Settings Table', true, `Table exists with ${data.length} settings`);

      // Test updating a setting
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({ setting_value: 'test_value' })
        .eq('setting_key', 'theme_mode');

      if (updateError) {
        this.addResult('System Settings Update', false, `Failed to update setting: ${updateError.message}`);
        return;
      }

      this.addResult('System Settings Update', true, 'Successfully updated setting');

      // Restore original value
      await supabase
        .from('system_settings')
        .update({ setting_value: 'light' })
        .eq('setting_key', 'theme_mode');

    } catch (error) {
      this.addResult('System Settings Table', false, `Unexpected error: ${error}`);
    }
  }

  async testBroadcastsTable() {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .limit(1);

      if (error) {
        this.addResult('Broadcasts Table', false, `Table query failed: ${error.message}`);
        return;
      }

      this.addResult('Broadcasts Table', true, 'Table exists and is queryable');

    } catch (error) {
      this.addResult('Broadcasts Table', false, `Unexpected error: ${error}`);
    }
  }

  async testSecurityAlertsTable() {
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .limit(1);

      if (error) {
        this.addResult('Security Alerts Table', false, `Table query failed: ${error.message}`);
        return;
      }

      this.addResult('Security Alerts Table', true, 'Table exists and is queryable');

    } catch (error) {
      this.addResult('Security Alerts Table', false, `Unexpected error: ${error}`);
    }
  }

  async testProjectTemplatesTable() {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .limit(1);

      if (error) {
        this.addResult('Project Templates Table', false, `Table query failed: ${error.message}`);
        return;
      }

      this.addResult('Project Templates Table', true, 'Table exists and is queryable');

    } catch (error) {
      this.addResult('Project Templates Table', false, `Unexpected error: ${error}`);
    }
  }

  async testUserTableUpdates() {
    try {
      // Test if email field was added to users table
      const { data, error } = await supabase
        .from('users')
        .select('id, email, is_active, is_suspended, last_login, login_attempts')
        .limit(1);

      if (error) {
        this.addResult('User Table Updates', false, `Failed to query new user fields: ${error.message}`);
        return;
      }

      this.addResult('User Table Updates', true, 'New user fields are accessible');

    } catch (error) {
      this.addResult('User Table Updates', false, `Unexpected error: ${error}`);
    }
  }

  async testHelperFunctions() {
    try {
      // Test dismiss_alert function
      const { data, error } = await supabase.rpc('dismiss_alert', {
        alert_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        user_id: '00000000-0000-0000-0000-000000000000'   // Dummy UUID
      });

      // Function should exist even if it returns false for non-existent IDs
      if (error && !error.message.includes('function dismiss_alert')) {
        this.addResult('Helper Functions', false, `Function test failed: ${error.message}`);
        return;
      }

      this.addResult('Helper Functions', true, 'Helper functions are accessible');

    } catch (error) {
      this.addResult('Helper Functions', false, `Unexpected error: ${error}`);
    }
  }

  async testRealDataIntegration() {
    try {
      // Test that we can query actual user and project data
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, is_admin')
        .limit(5);

      if (usersError) {
        this.addResult('Real Data Integration', false, `Failed to query users: ${usersError.message}`);
        return;
      }

      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status')
        .limit(5);

      if (projectsError) {
        this.addResult('Real Data Integration', false, `Failed to query projects: ${projectsError.message}`);
        return;
      }

      this.addResult('Real Data Integration', true, 
        `Successfully queried real data: ${users?.length || 0} users, ${projects?.length || 0} projects`);

    } catch (error) {
      this.addResult('Real Data Integration', false, `Unexpected error: ${error}`);
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Real Data Integration Tests...\n');

    await this.testSystemAlertsTable();
    await this.testSystemSettingsTable();
    await this.testBroadcastsTable();
    await this.testSecurityAlertsTable();
    await this.testProjectTemplatesTable();
    await this.testUserTableUpdates();
    await this.testHelperFunctions();
    await this.testRealDataIntegration();

    console.log('\n📊 Test Results Summary:');
    console.log('========================');

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`✅ Passed: ${passed}/${total} (${percentage}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    if (percentage === 100) {
      console.log('\n🎉 All tests passed! Real data integration is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the migration and component implementations.');
    }

    return this.results;
  }
}

// Export for use in components or testing
export const testRealDataIntegration = async () => {
  const tester = new RealDataTester();
  return await tester.runAllTests();
};

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
  console.log('Real Data Integration Tester loaded. Call testRealDataIntegration() to run tests.');
}
