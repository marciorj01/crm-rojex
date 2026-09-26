import { readObject, readText } from './http';

export function isLoginForm(request: Request): boolean {
  return request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() === 'application/x-www-form-urlencoded';
}

export async function readLoginCredentials(request: Request): Promise<{ email: string; password: string } | null> {
  const values = isLoginForm(request)
    ? Object.fromEntries(new URLSearchParams(await readText(request)))
    : await readObject(request);
  // Accept the previous JSON contract as well as the named form fields.
  const email = values.email ?? values.username;
  const password = values.password;
  if (typeof email !== 'string' || typeof password !== 'string' ||
    email.length > 254 || password.length > 256 || !password ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return null;
  return { email: email.trim(), password };
}
