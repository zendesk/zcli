import { describe, expect, it } from 'vitest';
import authConfig from './config';

describe('test authentication', () => {
  it('should return authentication type', () => {
    expect(authConfig.type).toBe('oauth2');
  });
});
