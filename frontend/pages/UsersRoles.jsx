import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { 
  Users, 
  Shield, 
  Plus,
  Edit2,
  Trash2,
  Mail,
  MoreHorizontal,
  UserPlus
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';

const emptyUser = {
  email: '',
  password: '',
  name: '',
  surname: '',
  patronymic: '',
  roleId: '',
};

export default function UsersRoles() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState(emptyUser);
  const [error, setError] = useState('');

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.users.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const users = Array.isArray(usersData) ? usersData : [];
  const roles = Array.isArray(rolesData) ? rolesData : [];

  const createMutation = useMutation({
    mutationFn: (data) => api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('users.errors.createFailed'));
      } else {
        setError(t('users.errors.createFailed'));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('users.errors.updateFailed'));
      } else {
        setError(t('users.errors.updateFailed'));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteDialogOpen(false);
      setCurrentUser(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('users.errors.deleteFailed'));
      } else {
        setError(t('users.errors.deleteFailed'));
      }
    },
  });

  const resetForm = () => {
    setFormData(emptyUser);
    setCurrentUser(null);
    setError('');
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setCurrentUser(user);
      setFormData({
        email: user.email || '',
        password: '',
        name: user.name || '',
        surname: user.surname || '',
        patronymic: user.patronymic || '',
        roleId: user.roleId || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.roleId) {
      setError(t('users.errors.requiredFields'));
      return;
    }

    if (!currentUser && !formData.password) {
      setError(t('users.errors.passwordRequired'));
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError(t('users.errors.passwordMinLength'));
      return;
    }

    const submitData = {
      email: formData.email,
      roleId: formData.roleId,
      name: formData.name || null,
      surname: formData.surname || null,
      patronymic: formData.patronymic || null,
    };

    if (currentUser) {
      updateMutation.mutate({ id: currentUser.userId, data: submitData });
    } else {
      submitData.password = formData.password;
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (user) => {
    setCurrentUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (currentUser) {
      deleteMutation.mutate(currentUser.userId);
    }
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.roleId === roleId);
    return role ? role.name : roleId;
  };

  const getFullName = (user) => {
    const parts = [user.name, user.surname, user.patronymic].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.email;
  };

  const userColumns = [
    {
      accessorKey: 'user',
      header: t('users.table.user'),
      cell: ({ row }) => {
        const user = row.original;
        const fullName = getFullName(user);
        return (
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="text-indigo-700 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400">
                {fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {fullName}
              </p>
              <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <Mail className="w-3 h-3" />
                {user.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'roleId',
      header: t('users.table.role'),
      cell: ({ row }) => {
        const roleName = getRoleName(row.original.roleId);
        return (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">{roleName}</span>
          </div>
        );
      },
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
            <DropdownMenuItem onClick={() => handleOpenDialog(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDelete(row.original)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const totalUsers = users.length;
  const adminCount = users.filter(u => {
    const role = roles.find(r => r.roleId === u.roleId);
    return role && role.name.toLowerCase().includes('admin');
  }).length;
  const standardCount = totalUsers - adminCount;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('users.title')}
        description={t('users.description')}
        action={
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <UserPlus className="w-4 h-4" />
            {t('users.addUser')}
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl dark:bg-indigo-500/20">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalUsers}</p>
                <p className="text-sm text-slate-500">{t('users.stats.totalUsers')}</p>
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
                <p className="text-sm text-slate-500">{t('users.stats.administrators')}</p>
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
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{standardCount}</p>
                <p className="text-sm text-slate-500">{t('users.stats.standardUsers')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={userColumns}
        data={users}
        isLoading={usersLoading}
        searchPlaceholder={t('users.searchPlaceholder')}
        emptyMessage={t('users.emptyMessage')}
      />

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentUser ? t('users.editUser') : t('users.addUser')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('users.form.email')} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleId">{t('users.form.role')} *</Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                  disabled={rolesLoading}
                >
                  <SelectTrigger id="roleId">
                    <SelectValue placeholder={t('users.form.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.roleId} value={role.roleId}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!currentUser && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('users.form.password')} *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
                <p className="text-xs text-slate-500">{t('users.form.passwordHint')}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="surname">{t('users.form.surname')}</Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t('users.form.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patronymic">{t('users.form.patronymic')}</Label>
                <Input
                  id="patronymic"
                  value={formData.patronymic}
                  onChange={(e) => setFormData({ ...formData, patronymic: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {currentUser ? t('common.save') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.deleteConfirm.description', { name: currentUser ? getFullName(currentUser) : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
