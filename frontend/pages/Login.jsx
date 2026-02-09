import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attemptsInfo, setAttemptsInfo] = useState(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(null);
  const retryTimerRef = useRef(null);

  // Restore rate limit state from localStorage on mount
  useEffect(() => {
    const savedLockout = localStorage.getItem('login_rate_limit_lockout');
    if (savedLockout) {
      try {
        const lockoutData = JSON.parse(savedLockout);
        const lockoutEndTime = lockoutData.lockoutEndTime;
        const now = Date.now();
        
        if (lockoutEndTime > now) {
          // Still locked out, calculate remaining seconds
          const remainingSeconds = Math.ceil((lockoutEndTime - now) / 1000);
          if (remainingSeconds > 0) {
            setRetryAfterSeconds(remainingSeconds);
            setError('Превышено количество попыток входа');
            if (lockoutData.attemptsInfo) {
              setAttemptsInfo(lockoutData.attemptsInfo);
            }
          } else {
            // Lockout expired, clear localStorage
            localStorage.removeItem('login_rate_limit_lockout');
          }
        } else {
          // Lockout expired, clear localStorage
          localStorage.removeItem('login_rate_limit_lockout');
        }
      } catch (e) {
        // Invalid data, clear it
        localStorage.removeItem('login_rate_limit_lockout');
      }
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }
    };
  }, []);

  // Timer for retry countdown
  useEffect(() => {
    if (retryAfterSeconds !== null && retryAfterSeconds > 0) {
      // Clear existing timer
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }

      // Update every second
      retryTimerRef.current = setInterval(() => {
        setRetryAfterSeconds((prev) => {
          if (prev === null || prev <= 1) {
            if (retryTimerRef.current) {
              clearInterval(retryTimerRef.current);
            }
            // Clear localStorage when lockout expires
            localStorage.removeItem('login_rate_limit_lockout');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
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
        // Prepare human-friendly rate limit information if available
        const rateLimit = err.rateLimit || {};
        const hasLimitInfo =
          typeof rateLimit.limit === 'number' &&
          typeof rateLimit.remaining === 'number';

        // Update attempts info state so it can be displayed separately
        if (hasLimitInfo) {
          setAttemptsInfo({
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
          });
        } else {
          setAttemptsInfo(null);
        }

        if (err.status === 401) {
          // Generic message; attempts are shown separately below if available
          setError('Неверный email или пароль');
          setRetryAfterSeconds(null);
        } else if (err.status === 429) {
          // Too many requests – user is temporarily blocked
          const retrySeconds = typeof rateLimit.retryAfterSeconds === 'number'
            ? rateLimit.retryAfterSeconds
            : null;
          
          // Start countdown timer and save to localStorage
          if (retrySeconds != null && retrySeconds > 0) {
            setRetryAfterSeconds(retrySeconds);
            
            // Save lockout end time to localStorage for persistence across page reloads
            const lockoutEndTime = Date.now() + (retrySeconds * 1000);
            localStorage.setItem('login_rate_limit_lockout', JSON.stringify({
              lockoutEndTime,
              attemptsInfo: hasLimitInfo ? {
                limit: rateLimit.limit,
                remaining: rateLimit.remaining,
              } : null,
            }));
          } else {
            setRetryAfterSeconds(null);
            localStorage.removeItem('login_rate_limit_lockout');
          }
          
          setError('Превышено количество попыток входа');
        } else {
          setError(err.message || 'Ошибка входа');
          setRetryAfterSeconds(null);
        }
      } else {
        setError('Ошибка подключения к серверу');
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
      setError('Заполните все поля');
      return;
    }
    loginMutation.mutate({ email, password });
  };

  // Format retry time for display
  const formatRetryTime = (seconds) => {
    if (seconds === null || seconds <= 0) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `Попробуйте снова через ${minutes} мин${secs > 0 ? ` ${secs} сек` : ''}.`;
    }
    return `Попробуйте снова через ${secs} сек.`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-xl flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Warehouse className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">WareFlow</CardTitle>
          <CardDescription>Вход в систему управления складом</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Пароль</Label>
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
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
                {retryAfterSeconds !== null && retryAfterSeconds > 0 && (
                  <div className="mt-1 text-xs">
                    {formatRetryTime(retryAfterSeconds)}
                  </div>
                )}
              </div>
            )}
            {attemptsInfo && (
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Осталось попыток входа: <span className="font-semibold">{attemptsInfo.remaining}</span> из{' '}
                <span className="font-semibold">{attemptsInfo.limit}</span>
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || (retryAfterSeconds !== null && retryAfterSeconds > 0)}
            >
              {loginMutation.isPending ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

