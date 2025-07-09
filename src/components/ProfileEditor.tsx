import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Building2, 
  Phone, 
  Save, 
  Edit, 
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/auth';
import { useSecurity } from '@/hooks/useSecurity';
import { useToast } from '@/hooks/use-toast';

const ProfileEditor = () => {
  const { user, updateUser } = useAuth();
  const { sanitizeInput, logSecurityEvent } = useSecurity();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    company_name: user?.company_name || '',
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Sanitize input
    const sanitizedValue = sanitizeInput(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return false;
    }

    if (formData.full_name.trim().length < 2) {
      setError('Full name must be at least 2 characters long');
      return false;
    }

    if (!formData.company_name.trim()) {
      setError('Company name is required');
      return false;
    }

    if (formData.company_name.trim().length < 2) {
      setError('Company name must be at least 2 characters long');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;

    setIsSaving(true);
    setError('');

    try {
      const response = await updateProfile(user.id, {
        full_name: formData.full_name.trim(),
        company_name: formData.company_name.trim(),
      });

      if (response.success && response.user) {
        // Update user in context
        updateUser(response.user);
        
        // Log security event
        await logSecurityEvent('profile_updated', {
          fields: ['full_name', 'company_name']
        });
        
        setIsEditing(false);
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        setError(response.error || 'Failed to update profile');
        await logSecurityEvent('profile_update_failed', {
          error: response.error
        });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError('An unexpected error occurred. Please try again.');
      await logSecurityEvent('profile_update_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      company_name: user?.company_name || '',
    });
    setError('');
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Profile Settings</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-border-light">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {user?.full_name ? getInitials(user.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">Account Information</CardTitle>
                <CardDescription>
                  Your personal and company details
                </CardDescription>
              </div>
            </div>
            
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-medium text-foreground">
                    Full Name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="pl-10 border-input-border focus:border-ring"
                      disabled={isSaving}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-sm font-medium text-foreground">
                    Company Name *
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company_name"
                      name="company_name"
                      type="text"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      className="pl-10 border-input-border focus:border-ring"
                      disabled={isSaving}
                      placeholder="Enter your company name"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary-hover w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Full Name
                </label>
                <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {user?.full_name || 'Not provided'}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Company Name
                </label>
                <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {user?.company_name || 'Not provided'}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone Number
                </label>
                <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {user?.phone_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  Contact support to change your phone number
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  Member Since
                </label>
                <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card className="border-border-light">
        <CardHeader>
          <CardTitle>Account Security</CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Password</h4>
                <p className="text-sm text-muted-foreground">
                  Last updated: Unknown
                </p>
              </div>
              <Button variant="outline" className="w-full sm:w-auto">
                Change Password
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Two-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button variant="outline" className="w-full sm:w-auto">
                Enable 2FA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileEditor;
