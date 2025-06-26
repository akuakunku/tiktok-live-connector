const { TikTokLiveConnection } = require('tiktok-live-connector');
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

function withSafeUser (data) {
  return {
    ...data,
    uniqueId: data?.uniqueId || data?.user?.uniqueId || 'anonymous',
  };
}

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  let connection = null;

  ws.on('message', async (msg) => {
    const parsed = JSON.parse(msg);
    if (parsed.action === 'connect' && parsed.username) {
      console.log(`[TikTok] Connecting to ${parsed.username}`);

      connection = new TikTokLiveConnection(parsed.username);

      connection.connect().then(() => {
        console.log(`[TikTok] Connected to ${parsed.username}`);
      }).catch(err => {
        console.error('[TikTok] Connection failed:', err);
        ws.send(JSON.stringify({ type: 'error', data: { message: 'Failed to connect' } }));
      });

      const forward = (type) => (data) => {
        ws.send(JSON.stringify({ type, data: withSafeUser (data) }));
      };

      connection.on('chat', forward('chat'));
      connection.on('gift', forward('gift'));
      connection.on('like', forward('like'));
      connection.on('follow', forward('follow'));
      connection.on('share', forward('share'));
      connection.on('viewer', forward('viewer'));
      connection.on('streamEnd', () => {
        ws.send(JSON.stringify({ type: 'end' }));
      });
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    if (connection) {
      connection.disconnect();
      connection = null;
    }
  });
});

server.listen(3001, () => {
  console.log('✅ TikTok Live WebSocket Server running at ws://localhost:3001');
});
