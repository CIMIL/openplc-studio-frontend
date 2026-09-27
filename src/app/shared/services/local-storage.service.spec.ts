import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  const service = new LocalStorageService();

  afterEach(() => localStorage.clear());

  it('returns null instead of throwing for malformed JSON', () => {
    localStorage.setItem('broken', '{not-json');

    expect(service.get('broken')).toBeNull();
  });

  it('removes stored values', () => {
    service.put('value', true);

    service.remove('value');

    expect(service.get('value')).toBeNull();
  });
});
