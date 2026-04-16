/**
 * auth — Base44 backend function wrapper for authentication actions.
 * FIX: This module was imported but did not exist, causing a build failure.
 * Routes auth actions (verifyEmail, resetPassword, etc.) through Base44 backend functions.
 */
import { base44 } from '../base44Client';

/**
 * Perform an authentication action via the Base44 backend.
 * @param {{ action: string, token?: string, email?: string, password?: string }} params
 * @returns {Promise<{ data: { success: boolean, message: string } }>}
 */
export async function auth(params) {
  try {
    const fn = base44.functions.configureCustomAuth;
    const result = await fn(params);
    return { data: result?.data ?? result };
  } catch (err) {
    throw new Error(err?.message ?? 'Auth action failed');
  }
}
