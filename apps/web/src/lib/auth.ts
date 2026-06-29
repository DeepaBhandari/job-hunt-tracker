import type { User } from '@job-hunt/types';
import { apiFetch } from './api';

export async function getMe(): Promise<User> {
  const data = await apiFetch<{ user: User }>('/auth/me');
  return data.user;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const data = await apiFetch<{ user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

export async function refreshSession(): Promise<User> {
  const data = await apiFetch<{ user: User }>('/auth/refresh', { method: 'POST' });
  return data.user;
}
