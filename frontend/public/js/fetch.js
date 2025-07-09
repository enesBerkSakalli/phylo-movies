
import { server } from './services/dataService.js';

export async function fetchMSAFromBackend() {
  return await server.fetchMSAFromBackend();
}
