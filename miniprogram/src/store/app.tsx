import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '@/utils/storage';

interface SettingsCtx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<SettingsCtx>({ settings: DEFAULT_SETTINGS, update: () => undefined });

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return getSettings();
    } catch (e) {
      console.error('[Settings] init failed', e);
      return DEFAULT_SETTINGS;
    }
  });

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSettings = (): SettingsCtx => useContext(Ctx);
