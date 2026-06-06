import React from 'react';
import { ArrowLeft, Settings, Moon, Sun, Globe, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { UserProfileCard } from '@/components/settings/UserProfileCard';
import { UserProfileAccess } from '@/components/settings/UserProfileAccess';

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  profile,
  darkMode,
  onDarkModeChange,
  onLogout,
}) {
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
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
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
                <Settings className="h-6 w-6" />
                {t('settings.title')}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <UserProfileCard user={user} profile={profile} />

            <UserProfileAccess profile={profile} />

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                <h3 className="text-lg font-semibold">{t('settings.appearance.title')}</h3>
              </div>
              <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-4">
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
                    {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {darkMode ? t('settings.appearance.themeLight') : t('settings.appearance.themeDark')}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">{t('settings.appearance.language')}</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <Globe className="mr-2 h-4 w-4" />
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

            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={() => logoutModal.open()}
            >
              <LogOut className="h-4 w-4" />
              {t('settings.logout')}
            </Button>
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
            <AlertDialogAction onClick={handleLogoutConfirm} className="bg-red-600 text-white hover:bg-red-700">
              {t('settings.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
