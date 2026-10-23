import { describe, expect, it } from 'vitest';
import { canEmployerMove, canWithdraw, employerNextStatuses } from '../../src/lib/workflow.js';

describe('application workflow', () => {
  it('lets employers move candidates forward through the pipeline', () => {
    expect(canEmployerMove('APPLIED', 'REVIEWING')).toBe(true);
    expect(canEmployerMove('REVIEWING', 'INTERVIEW')).toBe(true);
    expect(canEmployerMove('INTERVIEW', 'OFFERED')).toBe(true);
  });

  it('allows rejection from any active stage', () => {
    for (const s of ['APPLIED', 'REVIEWING', 'INTERVIEW', 'OFFERED'] as const) {
      expect(canEmployerMove(s, 'REJECTED')).toBe(true);
    }
  });

  it('blocks skipping straight to an offer or moving backwards', () => {
    expect(canEmployerMove('APPLIED', 'OFFERED')).toBe(false);
    expect(canEmployerMove('INTERVIEW', 'REVIEWING')).toBe(false);
  });

  it('treats rejected and withdrawn as terminal', () => {
    expect(employerNextStatuses('REJECTED')).toEqual([]);
    expect(employerNextStatuses('WITHDRAWN')).toEqual([]);
    expect(canEmployerMove('WITHDRAWN', 'REVIEWING')).toBe(false);
  });

  it('never lets employers mark an application as withdrawn', () => {
    expect(canEmployerMove('APPLIED', 'WITHDRAWN')).toBe(false);
  });

  it('lets seekers withdraw only active applications', () => {
    expect(canWithdraw('INTERVIEW')).toBe(true);
    expect(canWithdraw('REJECTED')).toBe(false);
    expect(canWithdraw('WITHDRAWN')).toBe(false);
  });
});
