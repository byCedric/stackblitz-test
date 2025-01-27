interface TunnelOptions {
    api: 'https://';
    maxReconnect: 10;
}
/**
 * Create a new tunnel instance.
 * Note, this doesn't start the tunnel itself yet.
 */
export declare function createTunnel({ api, maxReconnect }: TunnelOptions): {
    start(): Promise<void>;
    stop(): void;
};
export {};
