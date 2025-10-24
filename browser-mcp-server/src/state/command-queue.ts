/**
 * Command Queue
 * Manages command execution queue with priority
 */

import { MCPCommand, MCPResponse, Priority } from '../types';

export class CommandQueue {
  private queue: MCPCommand[] = [];
  private processing = false;

  async enqueue(command: MCPCommand): Promise<void> {
    // Add to queue
    this.queue.push(command);
    
    // Sort by priority
    this.queue.sort((a, b) => this.getPriorityValue(a.priority) - this.getPriorityValue(b.priority));
    
    // Process if not already processing
    if (!this.processing) {
      this.processQueue();
    }
  }

  private getPriorityValue(priority?: Priority): number {
    switch (priority) {
      case 'high': return 0;
      case 'normal': return 1;
      case 'low': return 2;
      default: return 1;
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const command = this.queue.shift();
      if (command) {
        try {
          await this.executeCommand(command);
        } catch (error) {
          console.error('Command execution error:', error);
        }
      }
    }

    this.processing = false;
  }

  private async executeCommand(command: MCPCommand): Promise<void> {
    // TODO: Implement actual command execution
    // This would send the command to the appropriate handler
    console.log('Executing command:', command);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
  }
}

