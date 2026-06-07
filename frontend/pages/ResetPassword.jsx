import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import AuthShell from '@/components/auth/AuthShell';
import {
  evaluatePasswordStrength,
  passwordStrengthBarClass,
  passwordStrengthLabel,
} from '@/lib/passwordStrength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Warehouse, ArrowLeft, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });

  useEffect(() => {
    if (!token) {
      setError(t('auth.resetPassword.errors.tokenMissing'));
    }
  }, [token, t]);

  useEffect(() => {
    setPasswordStrength(evaluatePasswordStrength(newPassword, t));
  }, [newPassword, t]);

  const resetPasswordMutation = useMutation({
    mutationFn: ({ token: resetToken, newPassword: password }) =>
      api.auth.resetPassword(resetToken, password),
    onSuccess: () => {
      setSuccess(true);
      setError('');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          if (err.code === 'INVALID_TOKEN') {
            setError(t('auth.resetPassword.errors.invalidToken'));
          } else if (err.code === 'TOKEN_EXPIRED') {
            setError(t('auth.resetPassword.errors.tokenExpired'));
          } else if (err.code === 'TOKEN_USED') {
            setError(t('auth.resetPassword.errors.tokenUsed'));
          } else if (err.code === 'WEAK_PASSWORD') {
            setError(t('auth.resetPassword.errors.weakPassword'));
          } else {
            setError(t('auth.resetPassword.errors.resetFailed'));
          }
        } else if (err.code === 'RATE_LIMIT_EXCEEDED') {
          setError(t('auth.login.errors.rateLimited'));
        } else if (err.code === 'NETWORK_ERROR') {
          setError(t('auth.resetPassword.errors.network'));
        } else {
          setError(t('auth.resetPassword.errors.resetFailed'));
        }
      } else {
        setError(t('auth.resetPassword.errors.network'));
      }
      setSuccess(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('auth.resetPassword.errors.tokenMissingShort'));
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError(t('auth.resetPassword.errors.fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.resetPassword.passwordsMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('auth.resetPassword.errors.tooShort'));
      return;
    }

    if (passwordStrength.score < 3) {
      setError(t('auth.resetPassword.errors.tooWeak'));
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  if (success) {
    return (
      <AuthShell
        title={t('auth.resetPassword.successTitle')}
        description={t('auth.resetPassword.successDescription')}
        icon={CheckCircle2}
        iconClassName="bg-gradient-to-br from-green-500 to-emerald-600"
      >
        <Button asChild className="w-full">
          <Link to="/login">{t('auth.resetPassword.goToLogin')}</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.resetPassword.title')}
      description={t('auth.resetPassword.description')}
      icon={Warehouse}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="newPassword">{t('auth.resetPassword.newPassword')}</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={resetPasswordMutation.isPending || !token}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={resetPasswordMutation.isPending}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-slate-500" />
              ) : (
                <Eye className="h-4 w-4 text-slate-500" />
              )}
            </Button>
          </div>
          {newPassword && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrengthBarClass(passwordStrength.score)}`}
                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                  />
                </div>
                <span className="min-w-[80px] text-right text-xs text-slate-500 dark:text-slate-400">
                  {passwordStrengthLabel(passwordStrength.score, t)}
                </span>
              </div>
              {passwordStrength.feedback.length > 0 && (
                <ul className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('auth.resetPassword.confirmPassword')}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={resetPasswordMutation.isPending || !token}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={resetPasswordMutation.isPending}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-slate-500" />
              ) : (
                <Eye className="h-4 w-4 text-slate-500" />
              )}
            </Button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500">{t('auth.resetPassword.passwordsMismatch')}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={resetPasswordMutation.isPending || !token || passwordStrength.score < 3}
        >
          {resetPasswordMutation.isPending
            ? t('auth.resetPassword.submitting')
            : t('auth.resetPassword.submit')}
        </Button>

        <div className="text-center">
          <Button asChild variant="ghost" className="text-sm">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('auth.resetPassword.backToLogin')}
            </Link>
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
