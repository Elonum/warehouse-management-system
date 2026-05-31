import React from 'react';
import { ArrowLeft, Settings, Moon, Sun, Globe, User, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/lib/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useModalState } from '@/hooks/useModalState';

function userInitial(user, fallback) {
  const name = user?.full_name || user?.name || '';
  return name.trim().charAt(0).toUpperCase() || fallback;
}

export function SettingsDialog({ open, onOpenChange, user, darkMode, onDarkModeChange, onLogout }) {
  const { language, setLanguage, t } = useI18n();
  const logoutModal = useModalState(false);

  const handleClose = () => onOpenChange(false);

  const handleLogoutConfirm = () => {
    logoutModal.close();
    onLogout();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleClose}
                aria-label={t('settings.back')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Settings className="w-6 h-6" />
                {t('settings.title')}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <h3 className="text-lg font-semibold">{t('settings.user.title')}</h3>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="text-lg font-semibold bg-indigo-500 text-white">
                      {userInitial(user, t('settings.user.fallbackInitial'))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">
                      {user?.full_name || t('settings.user.fallbackName')}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email || ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 mb-1">{t('settings.user.name')}</p>
                    <p className="font-medium">{user?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 mb-1">{t('settings.user.surname')}</p>
                    <p className="font-medium">{user?.surname || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 dark:text-slate-400 mb-1">{t('settings.user.role')}</p>
                    <p className="font-medium capitalize">
                      {user?.role || t('settings.user.defaultRole')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <h3 className="text-lg font-semibold">{t('settings.appearance.title')}</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme">{t('settings.appearance.theme')}</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {darkMode ? t('settings.appearance.themeDark') : t('settings.appearance.themeLight')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDarkModeChange(!darkMode)}
                    className="gap-2"
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {darkMode ? t('settings.appearance.themeLight') : t('settings.appearance.themeDark')}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">{t('settings.appearance.language')}</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <Globe className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">{t('settings.appearance.languageRu')}</SelectItem>
                      <SelectItem value="en">{t('settings.appearance.languageEn')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="pt-2">
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => logoutModal.open()}
              >
                <LogOut className="w-4 h-4" />
                {t('settings.logout')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={logoutModal.isOpen} onOpenChange={logoutModal.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.logout')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.logoutConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => logoutModal.close()}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm} className="bg-red-600 hover:bg-red-700 text-white">
              {t('settings.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
