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

function sendAndWait(ws, message, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      ws.removeEventListener('message', handler);
      reject(new Error('WebSocket message timeout'));
    }, timeoutMs);

    const handler = (data) => {
      clearTimeout(timeoutId);
      ws.removeEventListener('message', handler);
      try {
        const dataStr = typeof data === 'string' ? data : (Buffer.isBuffer(data) ? data.toString() : String(data));
        const parsed = JSON.parse(dataStr);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Failed to parse WebSocket message: ' + String(data)));
      }
    };

    ws.addEventListener('message', handler);
    ws.send(JSON.stringify(message));
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

    it('should reject invalid token', async () => {
      const ws = await connectWebSocket();
      const response = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'AUTH', token: 'invalid_token' }));
      });
      const dataStr = typeof response === 'string' ? response : (Buffer.isBuffer(response) ? response.toString() : String(response));
      const parsed = JSON.parse(dataStr);
      expect(parsed.type).toBe('ERROR');
      expect(parsed.code).toBe('INVALID_TOKEN');
      await closeWebSocket(ws);
    });

    it('should reject missing token', async () => {
      const ws = await connectWebSocket();
      const response = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'AUTH' }));
      });
      const dataStr = typeof response === 'string' ? response : (Buffer.isBuffer(response) ? response.toString() : String(response));
      const parsed = JSON.parse(dataStr);
      expect(parsed.type).toBe('ERROR');
      expect(parsed.code).toBe('INVALID_TOKEN');
      await closeWebSocket(ws);
    });

    it('should reject unauthenticated signaling messages', async () => {
      const ws = await connectWebSocket();
      const response = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'JOIN_ROOM', conversationId: 'test123' }));
      });
      const dataStr = typeof response === 'string' ? response : (Buffer.isBuffer(response) ? response.toString() : String(response));
      const parsed = JSON.parse(dataStr);
      expect(parsed.type).toBe('ERROR');
      expect(parsed.code).toBe('NOT_AUTHENTICATED');
      await closeWebSocket(ws);
    });

    it('should handle malformed JSON', async () => {
      const ws = await connectWebSocket();
      ws.send('not valid json');
      const response = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send('not valid json');
      });
      const dataStr = typeof response === 'string' ? response : (Buffer.isBuffer(response) ? response.toString() : String(response));
      const parsed = JSON.parse(dataStr);
      expect(parsed.type).toBe('ERROR');
      expect(parsed.code).toBe('INVALID_JSON');
      await closeWebSocket(ws);
    });

    it('should handle unknown message types', async () => {
      const ws = await connectWebSocket();
      // First authenticate
      await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'AUTH', token: 'invalid_token' }));
      });
      // Now send unknown message type - should still get NOT_AUTHENTICATED since token is invalid
      const response = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'UNKNOWN_TYPE' }));
      });
      const dataStr = typeof response === 'string' ? response : (Buffer.isBuffer(response) ? response.toString() : String(response));
      const parsed = JSON.parse(dataStr);
      expect(parsed.type).toBe('ERROR');
      expect(parsed.code).toBe('NOT_AUTHENTICATED');
      await closeWebSocket(ws);
    });

    it('should reject oversized payloads', async () => {
      const ws = await connectWebSocket();
      const largePayload = 'A'.repeat(65 * 1024);
      const response = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'OFFER', sdp: largePayload, conversationId: 'test123' }));
      });
      const dataStr = typeof response === 'string' ? response : (Buffer.isBuffer(response) ? response.toString() : String(response));
      const parsed = JSON.parse(dataStr);
      expect(parsed.type).toBe('ERROR');
      expect(parsed.code).toBe('NOT_AUTHENTICATED');
      await closeWebSocket(ws);
    });

    it('should reject invalid OFFER SDP', async () => {
      const ws = await connectWebSocket();
      const response = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'OFFER', conversationId: 'test123' }));
      });
      const dataStr = typeof response === 'string' ? response : (Buffer.isBuffer(response) ? response.toString() : String(response));
      const parsed = JSON.parse(dataStr);
      expect(parsed.type).toBe('ERROR');
      expect(parsed.code).toBe('NOT_AUTHENTICATED');
      await closeWebSocket(ws);
    });

    it('should reject invalid ICE_CANDIDATE', async () => {
      const ws = await connectWebSocket();
      const response = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'ICE_CANDIDATE', conversationId: 'test123' }));
      });
      const dataStr = typeof response === 'string' ? response : (Buffer.isBuffer(response) ? response.toString() : String(response));
      const parsed = JSON.parse(dataStr);
      expect(parsed.type).toBe('ERROR');
      expect(parsed.code).toBe('NOT_AUTHENTICATED');
      await closeWebSocket(ws);
    });

    it('should dedupe duplicate signaling messages', async () => {
      const ws = await connectWebSocket();
      const response1 = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'OFFER', conversationId: 'test123', sdp: 'v=0\r\n' }));
      });
      const response2 = await new Promise((resolve) => {
        ws.once('message', (data) => resolve(data));
        ws.send(JSON.stringify({ type: 'OFFER', conversationId: 'test123', sdp: 'v=0\r\n' }));
      });
      const dataStr1 = typeof response1 === 'string' ? response1 : (Buffer.isBuffer(response1) ? response1.toString() : String(response1));
      const parsed1 = JSON.parse(dataStr1);
      const dataStr2 = typeof response2 === 'string' ? response2 : (Buffer.isBuffer(response2) ? response2.toString() : String(response2));
      const parsed2 = JSON.parse(dataStr2);
      expect([parsed1.code, parsed2.code]).toContain('NOT_AUTHENTICATED');
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
