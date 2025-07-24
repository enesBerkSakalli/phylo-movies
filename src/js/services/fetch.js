
import { server } from './dataService.js';

export async function fetchMSAFromBackend() {
  return await server.fetchMSAFromBackend();
}
