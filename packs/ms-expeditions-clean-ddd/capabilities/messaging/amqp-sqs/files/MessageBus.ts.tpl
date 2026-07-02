export interface MessageBus { publish(events: readonly unknown[]): Promise<void>; }
