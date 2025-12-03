declare module 'socket.io-client' {
  export interface Socket {
    id: string;
    connect(): this;
    disconnect(): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener?: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): this;
  }

  export interface ManagerOptions {
    transports?: string[];
    [key: string]: any;
  }

  export type SocketOptions = ManagerOptions;

  export function io(uri: string, opts?: SocketOptions): Socket;
}


