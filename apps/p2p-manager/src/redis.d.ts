declare module 'redis' {
  export interface RedisClientType {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    on(event: 'error', listener: (err: unknown) => void): void;
    connect(): Promise<void>;
  }

  export function createClient(config: { url: string }): RedisClientType;
}


