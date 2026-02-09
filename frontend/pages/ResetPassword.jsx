import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse, ArrowLeft, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [],
  });

  // Check if token is present
  useEffect(() => {
    if (!token) {
      setError('Токен сброса пароля отсутствует. Пожалуйста, запросите сброс пароля заново.');
    }
  }, [token]);

  // Validate password strength
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength({ score: 0, feedback: [] });
      return;
    }

    const feedback = [];
    let score = 0;

    if (newPassword.length >= 8) {
      score += 1;
    } else {
      feedback.push('Минимум 8 символов');
    }

    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) {
      score += 1;
    } else {
      feedback.push('Заглавные и строчные буквы');
    }

    if (/\d/.test(newPassword)) {
      score += 1;
    } else {
      feedback.push('Хотя бы одна цифра');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      score += 1;
    } else {
      feedback.push('Хотя бы один специальный символ');
    }

    setPasswordStrength({ score, feedback });
  }, [newPassword]);

  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, newPassword }) => api.auth.resetPassword(token, newPassword),
    onSuccess: () => {
      setSuccess(true);
      setError('');
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          if (err.code === 'INVALID_TOKEN') {
            setError('Токен сброса пароля недействителен или истек. Пожалуйста, запросите новый.');
          } else if (err.code === 'TOKEN_EXPIRED') {
            setError('Срок действия токена истек. Пожалуйста, запросите новый.');
          } else if (err.code === 'TOKEN_USED') {
            setError('Этот токен уже был использован. Пожалуйста, запросите новый.');
          } else if (err.code === 'WEAK_PASSWORD') {
            setError('Пароль не соответствует требованиям безопасности. Используйте более сложный пароль.');
          } else {
            setError(err.message || 'Ошибка при сбросе пароля');
          }
        } else {
          setError(err.message || 'Ошибка при сбросе пароля');
        }
      } else {
        setError('Ошибка подключения к серверу');
      }
      setSuccess(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Токен сброса пароля отсутствует');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Пароль слишком слабый. Используйте более сложный пароль.');
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
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
    if (passwordStrength.score === 1) return 'Очень слабый';
    if (passwordStrength.score === 2) return 'Слабый';
    if (passwordStrength.score === 3) return 'Средний';
    return 'Сильный';
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-xl flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br from-green-500 to-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Пароль успешно изменен</CardTitle>
            <CardDescription>
              Вы будете перенаправлены на страницу входа через несколько секунд
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">
                Перейти к входу
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-xl flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Warehouse className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Новый пароль</CardTitle>
          <CardDescription>
            Введите новый пароль для вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">Новый пароль</Label>
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
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
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
                <p className="text-xs text-red-500">Пароли не совпадают</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending || !token || passwordStrength.score < 3}
            >
              {resetPasswordMutation.isPending ? 'Сброс пароля...' : 'Изменить пароль'}
            </Button>

            <div className="text-center">
              <Button asChild variant="ghost" className="text-sm">
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Вернуться к входу
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

