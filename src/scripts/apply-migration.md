# Database Migration Instructions

To complete the removal of demo data and implement real database functionality, you need to run the migration script in your Supabase SQL Editor.

## Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration Script**
   - Copy the contents of `src/scripts/remove-demo-data-migration.sql`
   - Paste it into the SQL Editor
   - Execute the script

3. **Verify Tables Created**
   After running the migration, you should have these new tables:
   - `system_alerts` - For real system alerts instead of mock data
   - `broadcasts` - For real broadcast message history
   - `security_alerts` - For real security monitoring
   - `system_settings` - For persistent admin settings
   - `project_templates` - For real project templates
   - `broadcast_recipients` - For tracking message delivery
   - `alert_dismissals` - For tracking alert dismissals

4. **Verify User Table Updates**
   The `users` table should now have these additional fields:
   - `email` - Real email addresses instead of mock generation
   - `is_active` - User active status
   - `is_suspended` - User suspension status
   - `last_login` - Last login timestamp
   - `login_attempts` - Failed login attempt counter
   - `locked_until` - Account lockout timestamp

5. **Verify Views and Functions**
   - `storage_stats` view for real storage statistics
   - `dismiss_alert()` function for alert dismissals
   - `increment_alert_view()` function for alert view tracking

## What This Migration Accomplishes:

✅ **Removes All Mock Data** - No more hardcoded demo data anywhere
✅ **Real Database Integration** - All admin features now use actual database tables
✅ **Proper Data Persistence** - Settings, alerts, and templates are saved to database
✅ **Real Analytics** - Analytics calculated from actual user and project data
✅ **Security Monitoring** - Real security alerts and audit logging
✅ **Broadcast System** - Real message broadcasting with delivery tracking
✅ **Template Management** - Real project template creation and management

## Post-Migration Testing:

After running the migration, test these features:
1. Create system alerts in Admin Dashboard
2. Update system settings and verify persistence
3. Create project templates
4. Send broadcast messages
5. View analytics (should show real data)
6. Check security alerts section

All features should now work with real data instead of mock/demo data.
