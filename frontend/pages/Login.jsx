import React, { useState } from 'react';
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

  const loginMutation = useMutation({
    mutationFn: (credentials) => api.auth.login(credentials.email, credentials.password),
    onSuccess: () => {
      navigate('/');
      window.location.reload();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Неверный email или пароль');
        } else {
          setError(err.message || 'Ошибка входа');
        }
      } else {
        setError('Ошибка подключения к серверу');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }
    loginMutation.mutate({ email, password });
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
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

