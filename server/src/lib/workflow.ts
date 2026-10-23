import type { ApplicationStatus } from '@prisma/client';

/**
 * Hiring pipeline. Employers move candidates forward or reject them;
 * REJECTED and WITHDRAWN are terminal. Seekers can only withdraw.
 */
const EMPLOYER_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED: ['REVIEWING', 'INTERVIEW', 'REJECTED'],
  REVIEWING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFERED', 'REJECTED'],
  OFFERED: ['REJECTED'],
  REJECTED: [],
  WITHDRAWN: [],
};

export function employerNextStatuses(from: ApplicationStatus): ApplicationStatus[] {
  return EMPLOYER_TRANSITIONS[from];
}

export function canEmployerMove(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return EMPLOYER_TRANSITIONS[from].includes(to);
}

export function canWithdraw(status: ApplicationStatus): boolean {
  return status !== 'REJECTED' && status !== 'WITHDRAWN';
}
