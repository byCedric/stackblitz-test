const ALIGNMENT = 8;

// Get alignment bytes necessary for 64-bit alignment.
export const alignBytes = (offset: number): number => (ALIGNMENT - (offset % ALIGNMENT)) % ALIGNMENT;
