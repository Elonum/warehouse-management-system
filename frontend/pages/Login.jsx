import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import AuthShell from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Warehouse } from 'lucide-react';

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attemptsInfo, setAttemptsInfo] = useState(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(null);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    const savedLockout = localStorage.getItem('login_rate_limit_lockout');
    if (savedLockout) {
      try {
        const lockoutData = JSON.parse(savedLockout);
        const lockoutEndTime = lockoutData.lockoutEndTime;
        const now = Date.now();

        if (lockoutEndTime > now) {
          const remainingSeconds = Math.ceil((lockoutEndTime - now) / 1000);
          if (remainingSeconds > 0) {
            setRetryAfterSeconds(remainingSeconds);
            setError(t('auth.login.errors.rateLimited'));
            if (lockoutData.attemptsInfo) {
              setAttemptsInfo(lockoutData.attemptsInfo);
            }
          } else {
            localStorage.removeItem('login_rate_limit_lockout');
          }
        } else {
          localStorage.removeItem('login_rate_limit_lockout');
        }
      } catch {
        localStorage.removeItem('login_rate_limit_lockout');
      }
    }
  }, [t]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (retryAfterSeconds !== null && retryAfterSeconds > 0) {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }

      retryTimerRef.current = setInterval(() => {
        setRetryAfterSeconds((prev) => {
          if (prev === null || prev <= 1) {
            if (retryTimerRef.current) {
              clearInterval(retryTimerRef.current);
            }
            localStorage.removeItem('login_rate_limit_lockout');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [retryAfterSeconds]);

  const loginMutation = useMutation({
    mutationFn: (credentials) => api.auth.login(credentials.email, credentials.password),
    onSuccess: () => {
      setAttemptsInfo(null);
      setRetryAfterSeconds(null);
      localStorage.removeItem('login_rate_limit_lockout');
      navigate('/');
      window.location.reload();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        const rateLimit = err.rateLimit || {};
        const hasLimitInfo =
          typeof rateLimit.limit === 'number' && typeof rateLimit.remaining === 'number';

        if (hasLimitInfo) {
          setAttemptsInfo({
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
          });
        } else {
          setAttemptsInfo(null);
        }

        if (err.status === 401) {
          setError(t('auth.login.errors.invalidCredentials'));
          setRetryAfterSeconds(null);
        } else if (err.status === 429) {
          const retrySeconds =
            typeof rateLimit.retryAfterSeconds === 'number' ? rateLimit.retryAfterSeconds : null;

          if (retrySeconds != null && retrySeconds > 0) {
            setRetryAfterSeconds(retrySeconds);
            const lockoutEndTime = Date.now() + retrySeconds * 1000;
            localStorage.setItem(
              'login_rate_limit_lockout',
              JSON.stringify({
                lockoutEndTime,
                attemptsInfo: hasLimitInfo
                  ? { limit: rateLimit.limit, remaining: rateLimit.remaining }
                  : null,
              }),
            );
          } else {
            setRetryAfterSeconds(null);
            localStorage.removeItem('login_rate_limit_lockout');
          }

          setError(t('auth.login.errors.rateLimited'));
        } else {
          setError(err.message || t('auth.login.errors.loginFailed'));
          setRetryAfterSeconds(null);
        }
      } else {
        setError(t('auth.login.errors.network'));
        setAttemptsInfo(null);
        setRetryAfterSeconds(null);
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setAttemptsInfo(null);
    setRetryAfterSeconds(null);
    localStorage.removeItem('login_rate_limit_lockout');
    if (!email || !password) {
      setError(t('auth.login.errors.fillAllFields'));
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const formatRetryTime = (seconds) => {
    if (seconds === null || seconds <= 0) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return t('auth.login.retryInMinutes', {
        minutes,
        secondsPart: secs > 0 ? t('auth.login.retrySecondsPart', { seconds: secs }) : '',
      });
    }
    return t('auth.login.retryInSeconds', { seconds: secs });
  };

  return (
    <AuthShell title={t('layout.appName')} description={t('auth.login.subtitle')} icon={Warehouse}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.login.password')}</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
            {retryAfterSeconds !== null && retryAfterSeconds > 0 && (
              <div className="mt-1 text-xs">{formatRetryTime(retryAfterSeconds)}</div>
            )}
          </div>
        )}
        {attemptsInfo && (
          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
            {t('auth.login.attemptsLeft', {
              remaining: attemptsInfo.remaining,
              limit: attemptsInfo.limit,
            })}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loginMutation.isPending || (retryAfterSeconds !== null && retryAfterSeconds > 0)}
        >
          {loginMutation.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>

        <div className="text-center">
          <Button asChild variant="link" className="link-primary h-auto p-0 text-sm">
            <Link to="/forgot-password">{t('auth.login.forgotPassword')}</Link>
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
