import { base44 } from '../base44Client';
export const auth = base44.functions.auth || (() => Promise.resolve({ data: {} }));
