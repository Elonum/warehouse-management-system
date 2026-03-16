import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Eye,
  EyeOff,
  AlertCircle,
  Copy,
  Check,
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
import { useModalState } from '@/hooks/useModalState';
import { cn } from '@/lib/utils';

const emptyUser = {
  email: '',
  password: '',
  name: '',
  surname: '',
  patronymic: '',
  roleId: '',
};

// Format name input - remove invalid characters
const formatNameInput = (value) => {
  return value.replace(/[^А-Яа-яЁёA-Za-z]/g, '').slice(0, 50);
};

export default function UsersRoles() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const createEditModal = useModalState(null);
  const deleteModal = useModalState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState(emptyUser);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const [fieldErrors, setFieldErrors] = useState({});
  const [copied, setCopied] = useState(false);

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

  // Helper function to get role name
  const getRoleName = useCallback((roleId) => {
    if (!roleId) return '';
    const role = roles.find(r => r.roleId === roleId);
    return role ? role.name : '';
  }, [roles]);

  // Filter users based on search and role filter
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.roleId === roleFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => {
        const fullName = [user.name, user.surname, user.patronymic].filter(Boolean).join(' ').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const roleName = getRoleName(user.roleId).toLowerCase();
        return fullName.includes(query) || email.includes(query) || roleName.includes(query);
      });
    }

    return filtered;
  }, [users, searchQuery, roleFilter, getRoleName]);

  // Validate password strength
  useEffect(() => {
    if (!formData.password) {
      setPasswordStrength({ score: 0, feedback: [] });
      return;
    }

    const feedback = [];
    let score = 0;

    if (formData.password.length >= 8) {
      score += 1;
    } else {
      feedback.push(t('users.form.passwordRequirement.length'));
    }

    if (/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password)) {
      score += 1;
    } else {
      feedback.push(t('users.form.passwordRequirement.case'));
    }

    if (/\d/.test(formData.password)) {
      score += 1;
    } else {
      feedback.push(t('users.form.passwordRequirement.number'));
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      score += 1;
    } else {
      feedback.push(t('users.form.passwordRequirement.special'));
    }

    setPasswordStrength({ score, feedback });
  }, [formData.password]);

  const createMutation = useMutation({
    mutationFn: (data) => api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      createEditModal.close();
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let errorMsg = err.message || t('users.errors.createFailed');
        // Map backend validation errors to user-friendly messages
        if (err.code === 'INVALID_NAME' || err.code === 'NAME_REQUIRED') {
          errorMsg = t('users.errors.nameValidation');
        } else if (err.code === 'WEAK_PASSWORD') {
          errorMsg = t('users.errors.passwordWeak');
        } else if (err.code === 'INVALID_EMAIL') {
          errorMsg = t('users.errors.invalidEmail');
        }
        setError(errorMsg);
      } else {
        setError(t('users.errors.createFailed'));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      createEditModal.close();
      resetForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let errorMsg = err.message || t('users.errors.updateFailed');
        // Map backend validation errors to user-friendly messages
        if (err.code === 'INVALID_NAME' || err.code === 'NAME_REQUIRED') {
          errorMsg = t('users.errors.nameValidation');
        } else if (err.code === 'WEAK_PASSWORD') {
          errorMsg = t('users.errors.passwordWeak');
        } else if (err.code === 'INVALID_EMAIL') {
          errorMsg = t('users.errors.invalidEmail');
        }
        setError(errorMsg);
      } else {
        setError(t('users.errors.updateFailed'));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      deleteModal.close();
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
    setFieldErrors({});
    setPasswordStrength({ score: 0, feedback: [] });
    setShowPassword(false);
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
    setError('');
    setFieldErrors({});
    createEditModal.open(user);
  };

  const handleCloseDialog = () => {
    createEditModal.close();
    resetForm();
  };

  const handleNameChange = (field, value) => {
    const formatted = formatNameInput(value);
    setFormData({ ...formData, [field]: formatted });
    // Clear error for this field when user types
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const errors = {};

    // Validate email
    const email = formData.email.trim();
    if (!email) {
      errors.email = 'Email обязателен';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = 'Некорректный email';
      }
    }

    // Validate name (required)
    const name = formData.name.trim();
    const nameError = validateNameField(name, t);
    if (!name) {
      errors.name = t('users.errors.nameRequired');
    } else if (nameError) {
      errors.name = nameError;
    }

    // Validate surname (required)
    const surname = formData.surname.trim();
    const surnameError = validateNameField(surname, t);
    if (!surname) {
      errors.surname = t('users.errors.surnameRequired');
    } else if (surnameError) {
      errors.surname = surnameError;
    }

    // Validate patronymic (optional)
    const patronymic = formData.patronymic?.trim() || '';
    if (patronymic) {
      const patronymicError = validateNameField(patronymic, t);
      if (patronymicError) {
        errors.patronymic = patronymicError;
      }
    }

    // Validate role
    if (!formData.roleId) {
      errors.roleId = t('users.errors.roleRequired');
    }

    // Validate password
    if (!currentUser && !formData.password.trim()) {
      errors.password = t('users.errors.passwordRequired');
    } else if (formData.password && formData.password.trim().length > 0) {
      if (formData.password.length > 128) {
        errors.password = t('users.errors.passwordTooLong');
      } else if (passwordStrength.score < 4) {
        errors.password = t('users.errors.passwordWeak');
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const submitData = {
      email: email,
      roleId: formData.roleId,
      name: name,
      surname: surname,
      patronymic: patronymic || null,
    };

    if (currentUser) {
      if (formData.password && formData.password.trim() !== '') {
        submitData.password = formData.password.trim();
      }
      updateMutation.mutate({ id: currentUser.userId, data: submitData });
    } else {
      submitData.password = formData.password.trim();
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (user) => {
    setCurrentUser(user);
    deleteModal.open(user);
  };

  const confirmDelete = () => {
    if (currentUser) {
      deleteMutation.mutate(currentUser.userId);
    }
  };

  const getSelectedRoleName = () => {
    return getRoleName(formData.roleId);
  };

  const getFullName = (user) => {
    const parts = [user.name, user.surname, user.patronymic].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.email;
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score === 0) return 'bg-slate-200 dark:bg-slate-700';
    if (passwordStrength.score === 1) return 'bg-red-500';
    if (passwordStrength.score === 2) return 'bg-orange-500';
    if (passwordStrength.score === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score === 0) return '';
    if (passwordStrength.score === 1) return t('users.form.passwordStrength.veryWeak');
    if (passwordStrength.score === 2) return t('users.form.passwordStrength.weak');
    if (passwordStrength.score === 3) return t('users.form.passwordStrength.medium');
    return t('users.form.passwordStrength.strong');
  };

  const generateSecurePassword = () => {
    const length = 14;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specials = '!@#$%^&*()_+[]{}|;:,.<>?';

    // Гарантируем наличие всех типов символов
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specials[Math.floor(Math.random() * specials.length)];

    const all = lowercase + uppercase + numbers + specials;
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Лёгкая перемешка
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');

    setFormData((prev) => ({ ...prev, password }));
    setShowPassword(true);
    setCopied(false);
  };

  const handleCopyPassword = async () => {
    if (!formData.password) return;
    try {
      await navigator.clipboard.writeText(formData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
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

  const totalUsers = filteredUsers.length;
  
  // Count administrators
  const adminCount = filteredUsers.filter(u => {
    if (!u.roleId) return false;
    const role = roles.find(r => r.roleId === u.roleId);
    if (!role || !role.name) return false;
    const normalizedRoleName = role.name.trim().toLowerCase();
    return normalizedRoleName === 'администратор' || normalizedRoleName === 'administrator';
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('users.title')}
        description={t('users.description')}
      >
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          {t('users.addUser')}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* Search and Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder={t('users.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            maxLength={100}
          />
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('users.filters.allRoles')}>
              {roleFilter === 'all' 
                ? t('users.filters.allRoles')
                : (() => {
                    const role = roles.find(r => r.roleId === roleFilter);
                    return role ? role.name : t('users.filters.allRoles');
                  })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.filters.allRoles')}</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.roleId} value={role.roleId}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(searchQuery || roleFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('all');
            }}
          >
            {t('common.reset')}
          </Button>
        )}
      </div>

      <DataTable
        columns={userColumns}
        data={filteredUsers}
        isLoading={usersLoading}
        searchable={false}
        emptyMessage={t('users.emptyMessage')}
      />

      <Dialog open={createEditModal.isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentUser ? t('users.editUser') : t('users.addUser')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {t('users.form.email')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  maxLength={254}
                  autoComplete="email"
                  className={fieldErrors.email ? 'border-red-500' : ''}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleId">
                  {t('users.form.role')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.roleId || ''}
                  onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                  disabled={rolesLoading}
                >
                  <SelectTrigger id="roleId" className={fieldErrors.roleId ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('users.form.selectRole')}>
                      {getSelectedRoleName()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.roleId} value={role.roleId}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.roleId && (
                  <p className="text-xs text-red-500">{fieldErrors.roleId}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {t('users.form.password')} {!currentUser && <span className="text-red-500">*</span>}
              </Label>
              <div className="flex items-start gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!currentUser}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder={currentUser ? t('users.form.passwordChangeHint') : ''}
                    className={cn(fieldErrors.password ? 'border-red-500' : '', 'pr-16')}
                  />
                  <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-transparent"
                      onClick={handleCopyPassword}
                      disabled={!formData.password}
                      aria-label="Скопировать пароль"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="whitespace-nowrap"
                  onClick={generateSecurePassword}
                >
                  {t('users.form.generatePassword')}
                </Button>
              </div>
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-300', getPasswordStrengthColor())}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[80px] text-right">
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <span className="text-red-500">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {fieldErrors.password && (
                <p className="text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="surname">
                  {t('users.form.surname')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => handleNameChange('surname', e.target.value)}
                  required
                  maxLength={50}
                  className={fieldErrors.surname ? 'border-red-500' : ''}
                />
                {fieldErrors.surname && (
                  <p className="text-xs text-red-500">{fieldErrors.surname}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('users.form.name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange('name', e.target.value)}
                  required
                  maxLength={50}
                  className={fieldErrors.name ? 'border-red-500' : ''}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patronymic">{t('users.form.patronymic')}</Label>
                <Input
                  id="patronymic"
                  value={formData.patronymic}
                  onChange={(e) => handleNameChange('patronymic', e.target.value)}
                  maxLength={50}
                  className={fieldErrors.patronymic ? 'border-red-500' : ''}
                />
                {fieldErrors.patronymic && (
                  <p className="text-xs text-red-500">{fieldErrors.patronymic}</p>
                )}
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

      <AlertDialog open={deleteModal.isOpen} onOpenChange={deleteModal.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.deleteConfirm.description', { name: currentUser ? getFullName(currentUser) : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCurrentUser(null);
            }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
