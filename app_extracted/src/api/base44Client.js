import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "6862f92c2e623c50a6ce3dec", 
  requiresAuth: true // Ensure authentication is required for all operations
});
