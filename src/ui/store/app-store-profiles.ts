import * as store from './app-store-internals';

export function selectProfile(profileId: string | null): void {
  store.setAppState({ ...store.state, selectedProfileId: profileId });
  store.emit();
}
