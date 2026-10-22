import React from 'react';
import { SettingsProvider } from '@/store/app';
import './app.scss';

const App: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <SettingsProvider>{children}</SettingsProvider>;
};

export default App;
