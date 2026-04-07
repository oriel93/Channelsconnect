import { base44 } from '../base44Client';
export const airbnbConnect = base44.functions.airbnbConnect || (() => Promise.resolve({ data: { success: false, error: 'Not available' } }));
