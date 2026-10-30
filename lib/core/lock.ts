/**
 * Serialises the budget check and the money reservation for one mandate, so
 * two agents buying at the same moment cannot both spend the last of a budget.
 */
export interface KeyedLock {
  run<T>(key: string, fn: () => Promise<T>): Promise<T>;
}

/** In-process: a promise queue per key. */
export class MemoryLock implements KeyedLock {
  private tails = new Map<string, Promise<void>>();
  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((r) => (release = r));
    const tail = prev.then(() => mine);
    this.tails.set(key, tail);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}

/** Anything that hands out a dedicated connection, like a node-postgres Pool. */
export interface Connectable {
  connect(): Promise<{ query(text: string, params?: unknown[]): Promise<unknown>; release(): void }>;
}

export const isConnectable = (x: unknown): x is Connectable => typeof (x as Connectable | null)?.connect === "function";

/**
 * Across processes: a Postgres session advisory lock held on a dedicated
 * connection while the critical section runs on the pool. In-process callers
 * queue first, and at most `maxHeld` connections are ever held for locks, so
 * the pool keeps connections free for the work itself.
 */
export class PgAdvisoryLock implements KeyedLock {
  private local = new MemoryLock();
  private held = 0;
  private waiters: Array<() => void> = [];
  constructor(
    private pool: Connectable,
    private maxHeld = 2,
  ) {}

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return this.local.run(key, async () => {
      await this.slot();
      const c = await this.pool.connect().catch((e) => {
        this.free();
        throw e;
      });
      try {
        await c.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [`mandate-budget:${key}`]);
        try {
          return await fn();
        } finally {
          await c.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [`mandate-budget:${key}`]);
        }
      } finally {
        c.release();
        this.free();
      }
    });
  }

  private async slot() {
    if (this.held < this.maxHeld) {
      this.held++;
      return;
    }
    await new Promise<void>((r) => this.waiters.push(r));
  }
  private free() {
    const next = this.waiters.shift();
    if (next) next();
    else this.held--;
  }
}
