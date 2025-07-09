import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Users,
  Plus,
  Search,
  Filter,
  X,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Shield,
  ShieldCheck,
  ShieldX,
  RefreshCw,
  Download,
  Upload,
  Calendar,
  Mail,
  Phone,
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  EyeOff,
  Save,
  Ban,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  full_name: string;
  email: string;
  company_name: string;
  phone_number: string;
  is_admin: boolean;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
  last_login: string;
  projects_count: number;
  role: 'admin' | 'client' | 'manager';
}

interface UserFormData {
  full_name: string;
  email: string;
  company_name: string;
  phone_number: string;
  role: 'admin' | 'client' | 'manager';
  is_active: boolean;
  send_welcome_email: boolean;
}

const AdminUserManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  
  const [userForm, setUserForm] = useState<UserFormData>({
    full_name: '',
    email: '',
    company_name: '',
    phone_number: '',
    role: 'client',
    is_active: true,
    send_welcome_email: true
  });

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          projects (count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      } else {
        const formattedUsers: User[] = (data || []).map(userData => ({
          id: userData.id,
          full_name: userData.full_name || '',
          email: userData.email || '',
          company_name: userData.company_name || '',
          phone_number: userData.phone_number || '',
          is_admin: userData.is_admin || false,
          is_active: userData.is_active !== false,
          is_suspended: userData.is_suspended || false,
          created_at: userData.created_at,
          updated_at: userData.updated_at,
          last_login: userData.last_login || userData.updated_at,
          projects_count: userData.projects?.[0]?.count || 0,
          role: userData.is_admin ? 'admin' : 'client'
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active && !user.is_suspended) ||
      (statusFilter === 'suspended' && user.is_suspended) ||
      (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const createUser = async () => {
    if (!userForm.full_name.trim() || !userForm.email.trim()) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create user with email field
      const { data, error } = await supabase
        .from('users')
        .insert({
          full_name: userForm.full_name.trim(),
          email: userForm.email.trim(),
          company_name: userForm.company_name.trim(),
          phone_number: userForm.phone_number.trim(),
          is_admin: userForm.role === 'admin',
          is_active: userForm.is_active,
          is_suspended: false,
          password_hash: 'temp_password_hash' // Would be properly handled in real implementation
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        toast({
          title: "Error",
          description: "Failed to create user",
          variant: "destructive",
        });
        return;
      }

      const newUser: User = {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        company_name: data.company_name,
        phone_number: data.phone_number,
        is_admin: data.is_admin,
        is_active: data.is_active,
        is_suspended: data.is_suspended,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_login: data.last_login,
        projects_count: 0,
        role: data.is_admin ? 'admin' : 'client'
      };

      setUsers(prev => [newUser, ...prev]);

      toast({
        title: "User Created",
        description: `User ${userForm.full_name} has been created successfully`,
      });

      resetForm();
      setIsCreateModalOpen(false);

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: userForm.full_name.trim(),
          company_name: userForm.company_name.trim(),
          phone_number: userForm.phone_number.trim(),
          is_admin: userForm.role === 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) {
        console.error('Error updating user:', error);
        toast({
          title: "Error",
          description: "Failed to update user",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? {
              ...u,
              full_name: userForm.full_name.trim(),
              company_name: userForm.company_name.trim(),
              phone_number: userForm.phone_number.trim(),
              is_admin: userForm.role === 'admin',
              role: userForm.role,
              updated_at: new Date().toISOString()
            }
          : u
      ));

      toast({
        title: "User Updated",
        description: "User information has been updated successfully",
      });

      resetForm();
      setIsEditModalOpen(false);
      setEditingUser(null);

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const suspendUser = async (userId: string) => {
    try {
      // In a real implementation, this would update user status
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, is_suspended: true, is_active: false }
          : u
      ));

      toast({
        title: "User Suspended",
        description: "User has been suspended successfully",
      });
    } catch (error) {
      console.error('Error suspending user:', error);
    }
  };

  const activateUser = async (userId: string) => {
    try {
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, is_suspended: false, is_active: true }
          : u
      ));

      toast({
        title: "User Activated",
        description: "User has been activated successfully",
      });
    } catch (error) {
      console.error('Error activating user:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        });
        return;
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      toast({
        title: "User Deleted",
        description: "User has been deleted successfully",
      });

    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const bulkSuspendUsers = async () => {
    setIsBulkOperating(true);
    try {
      const selectedIds = Array.from(selectedUsers);
      
      setUsers(prev => prev.map(u =>
        selectedIds.includes(u.id)
          ? { ...u, is_suspended: true, is_active: false }
          : u
      ));

      toast({
        title: "Users Suspended",
        description: `${selectedIds.length} users have been suspended`,
      });

      setSelectedUsers(new Set());

    } catch (error) {
      console.error('Error bulk suspending users:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const bulkDeleteUsers = async () => {
    setIsBulkOperating(true);
    try {
      const selectedIds = Array.from(selectedUsers);
      
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', selectedIds);

      if (error) {
        console.error('Error bulk deleting users:', error);
        toast({
          title: "Error",
          description: "Failed to delete some users",
          variant: "destructive",
        });
        return;
      }

      setUsers(prev => prev.filter(u => !selectedIds.includes(u.id)));
      setSelectedUsers(new Set());

      toast({
        title: "Users Deleted",
        description: `${selectedIds.length} users have been deleted`,
      });

    } catch (error) {
      console.error('Error bulk deleting users:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const resetForm = () => {
    setUserForm({
      full_name: '',
      email: '',
      company_name: '',
      phone_number: '',
      role: 'client',
      is_active: true,
      send_welcome_email: true
    });
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name,
      email: user.email,
      company_name: user.company_name,
      phone_number: user.phone_number,
      role: user.role,
      is_active: user.is_active,
      send_welcome_email: false
    });
    setIsEditModalOpen(true);
  };

  const exportUsers = () => {
    const exportData = {
      users: filteredUsers.map(user => ({
        ...user,
        password: undefined // Don't export passwords
      })),
      export_metadata: {
        exported_at: new Date().toISOString(),
        exported_by: user?.full_name || 'Admin',
        total_users: filteredUsers.length,
        filters_applied: {
          search: searchTerm,
          role: roleFilter,
          status: statusFilter
        }
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `users_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Export Complete",
      description: "Users data has been exported successfully",
    });
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'client': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'admin': return <ShieldCheck className="h-3 w-3" />;
      case 'manager': return <Shield className="h-3 w-3" />;
      case 'client': return <Users className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportUsers}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user-name">Full Name *</Label>
                  <Input
                    id="user-name"
                    placeholder="Enter full name"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-email">Email *</Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="Enter email address"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-company">Company Name</Label>
                  <Input
                    id="user-company"
                    placeholder="Enter company name"
                    value={userForm.company_name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, company_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-phone">Phone Number</Label>
                  <Input
                    id="user-phone"
                    placeholder="Enter phone number"
                    value={userForm.phone_number}
                    onChange={(e) => setUserForm(prev => ({ ...prev, phone_number: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-role">Role</Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(value: 'admin' | 'client' | 'manager') =>
                      setUserForm(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send Welcome Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Send account setup instructions to the user
                    </p>
                  </div>
                  <Checkbox
                    checked={userForm.send_welcome_email}
                    onCheckedChange={(checked) =>
                      setUserForm(prev => ({ ...prev, send_welcome_email: !!checked }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsCreateModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={createUser}>
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.role === 'admin').length}
                </p>
                <p className="text-sm text-muted-foreground">Administrators</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.is_active && !u.is_suspended).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Ban className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.is_suspended).length}
                </p>
                <p className="text-sm text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
                <SelectItem value="manager">Managers</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {filteredUsers.length} of {users.length} users
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      {selectedUsers.size > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedUsers.size === filteredUsers.length}
                  onCheckedChange={selectAllUsers}
                />
                <span className="text-sm font-medium">
                  {selectedUsers.size} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBulkOperating}
                  onClick={bulkSuspendUsers}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend Selected
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBulkOperating}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedUsers.size} selected users? This action cannot be undone and will remove all their data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={bulkDeleteUsers}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                onCheckedChange={selectAllUsers}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No users found
              </h3>
              <p className="text-muted-foreground">
                {users.length === 0
                  ? "No users have been created yet"
                  : "No users match your current filters"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                      className="mt-1"
                    />

                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(user.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      {/* Header Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {user.full_name || 'Unnamed User'}
                          </h3>
                          <Badge className={getRoleColor(user.role)}>
                            {getRoleIcon(user.role)}
                            <span className="ml-1 capitalize">{user.role}</span>
                          </Badge>
                          {user.is_suspended ? (
                            <Badge variant="destructive">
                              <Ban className="h-3 w-3 mr-1" />
                              Suspended
                            </Badge>
                          ) : user.is_active ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {user.is_suspended ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => activateUser(user.id)}
                            >
                              <UserCheck className="h-4 w-4 text-green-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => suspendUser(user.id)}
                            >
                              <Ban className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{user.full_name}"? This action cannot be undone and will remove all their data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* User Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                        {user.company_name && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            <span>{user.company_name}</span>
                          </div>
                        )}
                        {user.phone_number && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <span>{user.phone_number}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{user.projects_count} projects</span>
                        <span>Last login: {new Date(user.last_login).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Full Name *</Label>
              <Input
                id="edit-user-name"
                placeholder="Enter full name"
                value={userForm.full_name}
                onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email *</Label>
              <Input
                id="edit-user-email"
                type="email"
                placeholder="Enter email address"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed after account creation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-company">Company Name</Label>
              <Input
                id="edit-user-company"
                placeholder="Enter company name"
                value={userForm.company_name}
                onChange={(e) => setUserForm(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-phone">Phone Number</Label>
              <Input
                id="edit-user-phone"
                placeholder="Enter phone number"
                value={userForm.phone_number}
                onChange={(e) => setUserForm(prev => ({ ...prev, phone_number: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-role">Role</Label>
              <Select
                value={userForm.role}
                onValueChange={(value: 'admin' | 'client' | 'manager') =>
                  setUserForm(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsEditModalOpen(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={updateUser}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;
