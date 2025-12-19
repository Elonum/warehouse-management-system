import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { 
  Users, 
  Shield, 
  MoreHorizontal, 
  Mail,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

export default function UsersRoles() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list('-created_date'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setRoleDialogOpen(false);
      setCurrentUser(null);
    },
  });

  const handleRoleChange = (user) => {
    setCurrentUser(user);
    setSelectedRole(user.role || 'user');
    setRoleDialogOpen(true);
  };

  const handleRoleSubmit = (e) => {
    e.preventDefault();
    updateUserMutation.mutate({ 
      id: currentUser.id, 
      data: { role: selectedRole } 
    });
  };

  const roleDescriptions = {
    admin: {
      title: 'Administrator',
      description: 'Full access to all features including user management',
      permissions: [
        'Manage all inventory',
        'Create and manage orders',
        'Manage users and roles',
        'Access all reports',
        'Configure system settings'
      ]
    },
    user: {
      title: 'Standard User',
      description: 'Access to inventory and order management',
      permissions: [
        'View and manage inventory',
        'Create and manage orders',
        'View stock reports',
        'Manage shipments'
      ]
    }
  };

  const userColumns = [
    {
      accessorKey: 'full_name',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="text-indigo-700 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400">
              {row.original.full_name?.charAt(0) || row.original.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.full_name || 'Unknown'}
            </p>
            <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <Mail className="w-3 h-3" />
              {row.original.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className={`h-4 w-4 ${row.original.role === 'admin' ? 'text-indigo-500' : 'text-slate-400'}`} />
          <StatusBadge status={row.original.role === 'admin' ? 'admin' : 'active'} />
        </div>
      ),
    },
    {
      accessorKey: 'created_date',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.created_date ? format(new Date(row.original.created_date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleRoleChange(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Change Role
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const adminCount = users.filter(u => u.role === 'admin').length;
  const userCount = users.filter(u => u.role !== 'admin').length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Users & Roles" 
        description="Manage user access and permissions"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl dark:bg-indigo-500/20">
                    <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{users.length}</p>
                    <p className="text-sm text-slate-500">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl dark:bg-purple-500/20">
                    <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{adminCount}</p>
                    <p className="text-sm text-slate-500">Administrators</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
                    <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{userCount}</p>
                    <p className="text-sm text-slate-500">Standard Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={userColumns}
            data={users}
            searchPlaceholder="Search users..."
            emptyMessage="No users found"
          />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(roleDescriptions).map(([role, info]) => (
              <Card key={role} className="dark:bg-slate-900 dark:border-slate-800">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                      role === 'admin' 
                        ? 'bg-indigo-100 dark:bg-indigo-500/20' 
                        : 'bg-emerald-100 dark:bg-emerald-500/20'
                    }`}>
                      <Shield className={`h-6 w-6 ${
                        role === 'admin' 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.title}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <h4 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Permissions
                  </h4>
                  <ul className="space-y-2">
                    {info.permissions.map((permission, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {permission}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 mt-4 border-t dark:border-slate-800">
                    <p className="text-sm text-slate-500">
                      {users.filter(u => u.role === role || (role === 'user' && u.role !== 'admin')).length} users with this role
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRoleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="text-indigo-700 bg-indigo-100">
                  {currentUser?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{currentUser?.full_name}</p>
                <p className="text-sm text-slate-500">{currentUser?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="user">Standard User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                Update Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}