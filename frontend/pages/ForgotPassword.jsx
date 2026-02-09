import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const requestResetMutation = useMutation({
    mutationFn: (email) => api.auth.requestPasswordReset(email),
    onSuccess: () => {
      setSuccess(true);
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || 'Ошибка при запросе сброса пароля');
      } else {
        setError('Ошибка подключения к серверу');
      }
      setSuccess(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!email) {
      setError('Введите email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Введите корректный email адрес');
      return;
    }

    requestResetMutation.mutate(email);
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
            <CardTitle className="text-2xl font-bold">Запрос отправлен</CardTitle>
            <CardDescription>
              Если указанный email существует в системе, на него отправлена инструкция по сбросу пароля
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="mb-2">Проверьте почту и следуйте инструкциям в письме.</p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Если письмо не пришло, проверьте папку "Спам" или попробуйте запросить сброс пароля снова через несколько минут.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Вернуться к входу
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
          <CardTitle className="text-2xl font-bold">Сброс пароля</CardTitle>
          <CardDescription>
            Введите email, указанный при регистрации, и мы отправим инструкцию по сбросу пароля
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            
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
                disabled={requestResetMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={requestResetMutation.isPending}
            >
              {requestResetMutation.isPending ? 'Отправка...' : 'Отправить инструкцию'}
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

