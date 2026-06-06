import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function permissionDisabledTitle(t, allowed, title) {
  if (allowed) return title;
  const hint = t('rbac.actionDisabled');
  return title ? `${title} — ${hint}` : hint;
}

export function GuardedButton({ allowed = true, disabledTitle, ...props }) {
  const { t } = useI18n();
  const blocked = !allowed;

  return (
    <Button
      {...props}
      disabled={props.disabled || blocked}
      title={permissionDisabledTitle(t, allowed, blocked ? (disabledTitle || props.title) : props.title)}
    />
  );
}

export function GuardedMenuItem({
  allowed = true,
  onClick,
  className,
  children,
  ...props
}) {
  const { t } = useI18n();
  const blocked = !allowed;

  return (
    <DropdownMenuItem
      {...props}
      className={cn(blocked && 'cursor-not-allowed opacity-50', className)}
      title={blocked ? t('rbac.actionDisabled') : props.title}
      onClick={(e) => {
        if (blocked) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.(e);
      }}
    >
      {children}
    </DropdownMenuItem>
  );
}
