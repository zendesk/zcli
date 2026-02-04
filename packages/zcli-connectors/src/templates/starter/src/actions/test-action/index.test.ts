import { describe, expect, it } from 'vitest';
import { testAction } from '.';

describe('test action', () => {
  it('should return test action name', () => {
    expect(testAction.name).toBe('test_action');
  });
});
