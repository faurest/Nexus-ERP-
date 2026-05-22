type EventCallback = (data: any) => void;

class EventBus {
    private listeners: Record<string, EventCallback[]> = {};

    subscribe(event: string, callback: EventCallback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }

    publish(event: string, data?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }
}

export const NexusEventBus = new EventBus();

export const EVENTS = {
    COMPANY_CREATED: 'COMPANY_CREATED',
    USER_INVITED: 'USER_INVITED',
    MARKETPLACE_ORDER_CREATED: 'MARKETPLACE_ORDER_CREATED',
    INVENTORY_UPDATED: 'INVENTORY_UPDATED',
    PERMISSION_CHANGED: 'PERMISSION_CHANGED'
};
