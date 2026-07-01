import { DomainEvent, DomainEventName } from './DomainEvents';
import { Logger } from '../../logging/Logger';

export class EventBus {
  private static instance: EventBus;
  private logger = Logger.getInstance();
  private listeners: Map<DomainEventName, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe(eventName: DomainEventName, callback: (event: DomainEvent) => Promise<void>) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(callback);
    
    return () => {
      const callbacks = this.listeners.get(eventName) || [];
      this.listeners.set(eventName, callbacks.filter(cb => cb !== callback));
    };
  }

  public async publish(eventName: DomainEventName, payload: any): Promise<void> {
    const event: DomainEvent = {
      name: eventName,
      timestamp: new Date(),
      payload
    };
    
    this.logger.debug(`[EventBus] Publishing event: ${eventName}`, { payload });
    
    const callbacks = this.listeners.get(eventName) || [];
    // Process asynchronously to not block the main thread
    setTimeout(() => {
      callbacks.forEach(async (cb) => {
        try {
          await cb(event);
        } catch (error) {
          this.logger.error(`[EventBus] Error in listener for ${eventName}`, error);
        }
      });
    }, 0);
  }
}
