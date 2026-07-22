export const defineImpl =
  <T1, T2, T3 = {}>(fn: (dto: T1, provider: T3) => Promise<T2>) =>
  (provider: T3) =>
  async (dto: T1) =>
    await fn(dto, provider);
