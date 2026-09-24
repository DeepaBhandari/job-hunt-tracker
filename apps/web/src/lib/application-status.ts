import type { ApplicationStatus } from '@job-hunt/types';

export const APPLICATION_STATUSES = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
] satisfies readonly ApplicationStatus[];

export const STATUS_COLORS: Record<string, string> = {
  SAVED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  APPLIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SCREENING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  INTERVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  OFFER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WITHDRAWN: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};
