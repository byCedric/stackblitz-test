const MAX_INT32 = 2**32;

export type RequestID = number & {
  /** Marker to indicate that a `IdentifierSeed` may not be created directly */
  readonly _opaque: unique symbol;
};

const phash = (salt: number, seed?: RequestID): RequestID => {
  let h = (seed || 5381) | 0;
  h = (h << 5) + h + salt;
  return (h | 0) as RequestID;
};

export const nextRequestID = (previousRequestId: RequestID | undefined | null): RequestID => {
  if (previousRequestId == null) {
    const seed = typeof crypto === 'undefined'
      ? (Math.random() * 2 - 1) * MAX_INT32 & (MAX_INT32 - 1)
      : crypto.getRandomValues(new Int32Array(1))[0];
    return phash(seed);
  } else {
    const salt = phash(Date.now() % MAX_INT32);
    return phash(salt, previousRequestId);
  }
};
