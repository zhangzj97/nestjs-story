export class MapStrategy<T1 extends string, T2> {
  code: string | null = null;

  map: Record<T1, T2>;

  constructor(map: Record<T1, T2>) {
    this.map = map;
  }

  setCode(code: T1) {
    this.code = code;
  }

  getValue(): T2 {
    if (this.code === null) {
      throw new Error(`Strategy code is null`);
    }

    return this.map[this.code];
  }
}
