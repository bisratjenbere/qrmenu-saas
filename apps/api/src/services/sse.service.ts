import { EventEmitter } from 'events';
import { ServerResponse } from 'http';
import { AppError } from '../utils/errors.js';

class SSEService extends EventEmitter {
  private connections = new Map<string, Set<ServerResponse>>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 30000);
  }

  public subscribe(branchId: string, response: ServerResponse) {
    if (!this.connections.has(branchId)) {
      this.connections.set(branchId, new Set());
    }
    const branchConnections = this.connections.get(branchId)!;
    const maxConnections = parseInt(process.env.SSE_MAX_CONNECTIONS_PER_BRANCH || '10', 10);
    if (branchConnections.size >= maxConnections) {
      throw new AppError(429, 'TOO_MANY_CONNECTIONS', 'Too many active connection streams for this branch');
    }
    branchConnections.add(response);
  }

  public unsubscribe(branchId: string, response: ServerResponse) {
    const branchConnections = this.connections.get(branchId);
    if (branchConnections) {
      branchConnections.delete(response);
      if (branchConnections.size === 0) {
        this.connections.delete(branchId);
      }
    }
  }

  public emitEvent(branchId: string, eventType: string, data: any) {
    const branchConnections = this.connections.get(branchId);
    if (branchConnections) {
      const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      const maxFailed = parseInt(process.env.SSE_MAX_FAILED_WRITES || '5', 10);
      const toEvict: ServerResponse[] = [];

      for (const res of branchConnections) {
        const success = res.write(payload);
        if (!success) {
          (res as any)._failedWritesCount = ((res as any)._failedWritesCount || 0) + 1;
          if ((res as any)._failedWritesCount >= maxFailed) {
            toEvict.push(res);
          }
        } else {
          (res as any)._failedWritesCount = 0;
        }
      }

      for (const res of toEvict) {
        res.end();
        branchConnections.delete(res);
      }
    }
  }

  private broadcastHeartbeat() {
    const maxFailed = parseInt(process.env.SSE_MAX_FAILED_WRITES || '5', 10);
    for (const [branchId, branchConnections] of this.connections.entries()) {
      const toEvict: ServerResponse[] = [];
      for (const res of branchConnections) {
        const success = res.write(`event: heartbeat\ndata: {}\n\n`);
        if (!success) {
          (res as any)._failedWritesCount = ((res as any)._failedWritesCount || 0) + 1;
          if ((res as any)._failedWritesCount >= maxFailed) {
            toEvict.push(res);
          }
        } else {
          (res as any)._failedWritesCount = 0;
        }
      }
      for (const res of toEvict) {
        res.end();
        branchConnections.delete(res);
      }
      if (branchConnections.size === 0) {
        this.connections.delete(branchId);
      }
    }
  }

  public closeAll() {
    clearInterval(this.heartbeatInterval);
    for (const branchConnections of this.connections.values()) {
      for (const res of branchConnections) {
        res.write(`event: server-shutdown\ndata: {"reason":"deploy"}\nretry: 1000\n\n`);
        res.end();
      }
    }
    this.connections.clear();
  }
}

export const sseService = new SSEService();
