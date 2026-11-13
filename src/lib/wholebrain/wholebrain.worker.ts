import { handleRequest, type WholeBrainRequest } from './client';

self.onmessage = (e: MessageEvent<{ id: number; payload: WholeBrainRequest }>) => {
  const { id, payload } = e.data;
  try {
    self.postMessage({ id, payload: handleRequest(payload) });
  } catch (err) {
    self.postMessage({ id, payload: null, error: err instanceof Error ? err.message : String(err) });
  }
};
