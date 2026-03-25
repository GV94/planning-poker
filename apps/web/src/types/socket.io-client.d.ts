/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'socket.io-client' {
  export interface Manager {
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener?: (...args: any[]) => void): this;
  }

  export interface Socket {
    id: string;
    io: Manager;
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
