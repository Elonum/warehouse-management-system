import React from 'react';
import { MarketplaceImportMockLayout } from '@/features/mpShipments/import/MarketplaceImportMockLayout';
import { useI18n } from '@/lib/i18n';

export default function ShipmentImportOzon() {
  const { t } = useI18n();

  return (
    <MarketplaceImportMockLayout
      title={t('shipments.import.ozonPageTitle')}
      description={t('shipments.import.ozonPageDescription')}
      badge={t('shipments.import.ozon')}
      accentClassName="from-sky-600 to-blue-700"
    />
  );
}
