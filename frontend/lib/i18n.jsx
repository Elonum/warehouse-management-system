import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  ru: {
    common: {
      loading: 'Загрузка...',
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      create: 'Создать',
      add: 'Добавить',
      close: 'Закрыть',
      search: 'Поиск',
      actions: 'Действия',
      yes: 'Да',
      no: 'Нет',
      confirm: 'Подтвердить',
      back: 'Назад',
      next: 'Далее',
      submit: 'Отправить',
      reset: 'Сбросить',
    },
    layout: {
      appName: 'WareFlow',
      appDescription: 'Управление складом',
      settings: 'Настройки',
    },
    nav: {
      dashboard: 'Панель управления',
      products: 'Товары',
      warehouses: 'Склады',
      stock: 'Остатки',
      stockMovements: 'Движения товаров',
      supplierOrders: 'Заказы поставщикам',
      shipments: 'Отгрузки',
      inventoryAdjustments: 'Инвентаризация',
      productCosts: 'Себестоимость',
      usersRoles: 'Пользователи',
      referenceData: 'Справочники',
    },
    settings: {
      title: 'Настройки',
      user: {
        title: 'Информация о пользователе',
        email: 'Email',
        name: 'Имя',
        surname: 'Фамилия',
        role: 'Роль',
      },
      appearance: {
        title: 'Внешний вид',
        theme: 'Тема',
        themeLight: 'Светлая',
        themeDark: 'Темная',
        language: 'Язык',
        languageRu: 'Русский',
        languageEn: 'English',
      },
      notifications: {
        title: 'Уведомления',
        description: 'Показывать уведомления о важных событиях',
      },
      logout: 'Выход из аккаунта',
      logoutConfirm: 'Вы уверены, что хотите выйти?',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      add: 'Add',
      close: 'Close',
      search: 'Search',
      actions: 'Actions',
      yes: 'Yes',
      no: 'No',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      reset: 'Reset',
    },
    layout: {
      appName: 'WareFlow',
      appDescription: 'Warehouse Management',
      settings: 'Settings',
    },
    nav: {
      dashboard: 'Dashboard',
      products: 'Products',
      warehouses: 'Warehouses',
      stock: 'Stock',
      stockMovements: 'Stock Movements',
      supplierOrders: 'Supplier Orders',
      shipments: 'Shipments',
      inventoryAdjustments: 'Inventory Adjustments',
      productCosts: 'Product Costs',
      usersRoles: 'Users & Roles',
      referenceData: 'Reference Data',
    },
    settings: {
      title: 'Settings',
      user: {
        title: 'User Information',
        email: 'Email',
        name: 'Name',
        surname: 'Surname',
        role: 'Role',
      },
      appearance: {
        title: 'Appearance',
        theme: 'Theme',
        themeLight: 'Light',
        themeDark: 'Dark',
        language: 'Language',
        languageRu: 'Русский',
        languageEn: 'English',
      },
      notifications: {
        title: 'Notifications',
        description: 'Show notifications for important events',
      },
      logout: 'Logout',
      logoutConfirm: 'Are you sure you want to logout?',
    },
  },
};

const I18nContext = createContext({
  language: 'ru',
  setLanguage: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('language') || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang) => {
    setLanguageState(lang);
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
