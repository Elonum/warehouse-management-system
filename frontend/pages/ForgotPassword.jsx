import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import AuthShell from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle2, Warehouse } from 'lucide-react';

export default function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const requestResetMutation = useMutation({
    mutationFn: (value) => api.auth.requestPasswordReset(value),
    onSuccess: () => {
      setSuccess(true);
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'RATE_LIMIT_EXCEEDED') {
        setError(t('auth.login.errors.rateLimited'));
      } else if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
        setError(t('auth.forgotPassword.errors.network'));
      } else {
        setError(t('auth.forgotPassword.errors.requestFailed'));
      }
      setSuccess(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError(t('auth.forgotPassword.errors.emailRequired'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('auth.forgotPassword.errors.emailInvalid'));
      return;
    }

    requestResetMutation.mutate(email);
  };

  if (success) {
    return (
      <AuthShell
        title={t('auth.forgotPassword.successTitle')}
        description={t('auth.forgotPassword.successDescription')}
        icon={CheckCircle2}
        iconClassName="bg-gradient-to-br from-green-500 to-emerald-600"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <p className="mb-2">{t('auth.forgotPassword.successHint')}</p>
            <p className="text-xs text-slate-500">{t('auth.forgotPassword.successSpamHint')}</p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.forgotPassword.title')}
      description={t('auth.forgotPassword.description')}
      icon={Warehouse}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.login.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={requestResetMutation.isPending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={requestResetMutation.isPending}>
          {requestResetMutation.isPending
            ? t('auth.forgotPassword.submitting')
            : t('auth.forgotPassword.submit')}
        </Button>

        <div className="text-center">
          <Button asChild variant="ghost" className="text-sm">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
