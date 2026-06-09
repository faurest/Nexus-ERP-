import { useState, useEffect, useCallback } from 'react';

export function useSubNavigation<T extends string>(moduleName: string, defaultTab: T) {
  const [activeTab, setActiveTabState] = useState<T>(() => {
    const hash = window.location.hash.replace('#', '');
    const [main, sub] = hash.split('/');
    if (main === moduleName && sub) {
      return sub as T;
    }
    return defaultTab;
  });

  const setActiveTab = useCallback((tab: T) => {
    setActiveTabState(tab);
    const newHash = `#${moduleName}/${tab}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  }, [moduleName]);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      const [main, sub] = hash.split('/');
      if (main === moduleName) {
        setActiveTabState((sub as T) || defaultTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [moduleName, defaultTab]);

  return [activeTab, setActiveTab] as const;
}
