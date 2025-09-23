type Listener = (payload?: any) => void;

class EventBus {
  private listeners: Record<string, Set<Listener>> = {};

  on(event: string, listener: Listener): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener): void {
    this.listeners[event]?.delete(listener);
  }

  emit(event: string, payload?: any): void {
    this.listeners[event]?.forEach(l => {
      try { l(payload); } catch {}
    });
  }
}

const eventBus = new EventBus();
export default eventBus;
export const EVENTS = {
  API_ERROR: 'API_ERROR',
} as const;


