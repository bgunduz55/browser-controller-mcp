/**
 * Client Manager
 * Manages client connections and state
 */

import { ClientState } from '../types';

export class ClientManager {
  private clients: Map<string, ClientState> = new Map();

  addClient(client: ClientState): void {
    this.clients.set(client.id, client);
  }

  getClient(clientId: string): ClientState | undefined {
    return this.clients.get(clientId);
  }

  getAllClients(): ClientState[] {
    return Array.from(this.clients.values());
  }

  updateClientState(clientId: string, updates: Partial<ClientState>): void {
    const client = this.clients.get(clientId);
    if (client) {
      Object.assign(client, updates);
    }
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  getConnectedClients(): ClientState[] {
    return this.getAllClients().filter(client => client.connected);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getActiveCommandCount(): number {
    let count = 0;
    for (const client of this.clients.values()) {
      count += client.activeCommands.size;
    }
    return count;
  }
}

