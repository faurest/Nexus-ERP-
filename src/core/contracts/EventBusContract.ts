export interface EventBusContract {
  publish: (event: string, payload: any) => void;
  subscribe: (event: string, callback: (payload: any) => void) => () => void;
}
