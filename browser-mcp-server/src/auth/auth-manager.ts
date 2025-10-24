/**
 * Authentication Manager
 * Simplified - No API key required
 */

export class AuthManager {
  constructor() {
    // No authentication required
  }

  async validateApiKey(key: string): Promise<boolean> {
    // Always return true - no authentication required
    return true;
  }

  async generateApiKey(clientId: string, permissions: string[] = ['*']): Promise<string> {
    // Return a dummy key for compatibility
    return 'no-auth-required';
  }

  async revokeApiKey(key: string): Promise<void> {
    // No-op
  }

  getApiKey(key: string): any {
    // Return dummy key info
    return {
      key: 'no-auth-required',
      clientId: 'any-client',
      permissions: ['*'],
      createdAt: Date.now()
    };
  }

  getAllApiKeys(): any[] {
    return [];
  }
}

