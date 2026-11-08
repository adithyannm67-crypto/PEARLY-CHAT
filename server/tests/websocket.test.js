import { describe, it, expect, beforeAll } from 'vitest';
import { WebSocket } from 'ws';
import { env } from '../src/config/env.js';

const WS_URL = `ws://localhost:${env.PORT}`;

function connectWebSocket(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timeoutId = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket connection timeout'));
    }, timeoutMs);

    ws.on('open', () => {
      clearTimeout(timeoutId);
      resolve(ws);
    });
    ws.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

function closeWebSocket(ws) {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.on('close', () => resolve());
      ws.close();
    } else {
      resolve();
    }
  });
}

describe('WebSocket Signaling', () => {
  beforeAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection', async () => {
      const ws = await connectWebSocket();
      expect(ws.readyState).toBe(WebSocket.OPEN);
      await closeWebSocket(ws);
    });

    it('should send and receive WebSocket messages', async () => {
      const ws = await connectWebSocket();
      const response = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'PING', payload: 'test' }));
      });
      // WebSocket server echoes back messages, so we should get a response
      expect(response).toBeDefined();
      await closeWebSocket(ws);
    });

    it('should handle multiple simultaneous connections', async () => {
      const connections = [];
      try {
        for (let i = 0; i < 5; i++) {
          const ws = await connectWebSocket();
          connections.push(ws);
        }
        expect(connections.length).toBe(5);
      } finally {
        for (const ws of connections) {
          try {
            await closeWebSocket(ws);
          } catch {}
        }
      }
    });
  });
});
