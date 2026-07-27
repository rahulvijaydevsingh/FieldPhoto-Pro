import { subscribeAppSettings, saveAppSettingsToFirestore, AppSettings } from '../services/firebase';

export const settingsRepository = {
  subscribe: (onUpdate: (settings: AppSettings) => void) => subscribeAppSettings(onUpdate),
  save: (settings: Partial<AppSettings>) => saveAppSettingsToFirestore(settings),
};
