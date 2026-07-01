export type DomainEventName = 
  | 'CustomerCreated'
  | 'CustomerUpdated'
  | 'InvoiceCreated'
  | 'OrderCreated'
  | 'PaymentReceived'
  | 'NotificationCreated';

export interface DomainEvent {
  name: DomainEventName;
  timestamp: Date;
  payload: any;
}

export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private listeners: Map<DomainEventName, Array<(event: DomainEvent) => void>> = new Map();

  private constructor() {}

  public static getInstance(): DomainEventPublisher {
    if (!DomainEventPublisher.instance) {
      DomainEventPublisher.instance = new DomainEventPublisher();
    }
    return DomainEventPublisher.instance;
  }

  public subscribe(eventName: DomainEventName, callback: (event: DomainEvent) => void) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(callback);
    
    return () => {
      const callbacks = this.listeners.get(eventName) || [];
      this.listeners.set(eventName, callbacks.filter(cb => cb !== callback));
    };
  }

  public publish(eventName: DomainEventName, payload: any) {
    const event: DomainEvent = {
      name: eventName,
      timestamp: new Date(),
      payload
    };
    
    const callbacks = this.listeners.get(eventName) || [];
    callbacks.forEach(cb => {
      try {
        cb(event);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}`, error);
      }
    });
  }
}
