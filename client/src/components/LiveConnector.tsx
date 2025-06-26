import { useState, useEffect } from 'react';

type LogItem = {
  message: React.ReactNode;
  avatarUrl?: string;
};

const LiveConnector = () => {
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [notifications, setNotifications] = useState<LogItem[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [giftCount, setGiftCount] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Handle WebSocket connection
  useEffect(() => {
    if (!connected || !username) return;

    const socket = new WebSocket(
      process.env.NODE_ENV === 'development'
        ? 'ws://localhost:3001'
        : 'wss://tiktok-live-server.onrender.com'
    );

    socket.onopen = () => {
      console.log('WebSocket connected');
      socket.send(JSON.stringify({ 
        action: 'connect', 
        username 
      }));
      setLogs(prev => [{ message: `🔗 Connected to ${username}` }, ...prev]);
    };

    socket.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      handleEvent(type, data);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setLogs(prev => [{ message: '❌ WebSocket connection error' }, ...prev]);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      if (connected) {
        setLogs(prev => [{ message: '📡 Attempting to reconnect...' }, ...prev]);
        setTimeout(() => setConnected(true), 3000);
      }
    };

    setWs(socket);

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [connected, username]);

  const handleEvent = (type: string, data: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const avatarUrl = data?.user?.profilePicture?.url?.[0] || '';
    const uid = data?.uniqueId || '👻 unknown';

    switch (type) {
      case 'chat': {
        const message = (
          <span className="chat-message">
            [{timestamp}] 💬 <span className="username">{uid}</span>: 
            <span className="comment"> {data.comment}</span>
          </span>
        );

        setLogs(prev => [
          { message, avatarUrl },
          ...(data.comment?.trim().toLowerCase() === '!help' 
            ? [{ message: `📢 ${uid} requested help`, avatarUrl }] 
            : []),
          ...prev
        ]);
        break;
      }
      
      case 'gift':
        setGiftCount(prev => prev + (data.repeatCount || 1));
        setNotifications(prev => [
          {
            message: `🎁 ${uid} sent ${data.giftName || 'a gift'} x${data.repeatCount || 1}`,
            avatarUrl
          },
          ...prev
        ]);
        break;

      case 'like':
        setLikeCount(prev => prev + 1);
        setNotifications(prev => [
          {
            message: `❤️ ${uid} liked the stream`,
            avatarUrl
          },
          ...prev
        ]);
        break;

      case 'follow':
        setNotifications(prev => [
          {
            message: `👤 ${uid} followed`,
            avatarUrl
          },
          ...prev
        ]);
        break;

      case 'share':
        setNotifications(prev => [
          {
            message: `🔁 ${uid} shared the stream`,
            avatarUrl
          },
          ...prev
        ]);
        break;

      case 'end':
        setLogs(prev => [{ message: '🚫 Live stream ended' }, ...prev]);
        setConnected(false);
        break;

      default:
        console.log('Unhandled event:', type, data);
    }
  };

  const handleConnect = () => {
    if (!username.trim()) {
      setLogs(prev => [{ message: '⚠️ Please enter a username' }, ...prev]);
      return;
    }
    setConnected(true);
  };

  const handleDisconnect = () => {
    if (ws) {
      ws.send(JSON.stringify({ action: 'disconnect' }));
      ws.close();
    }
    setConnected(false);
    setLogs(prev => [{ message: `🔌 Disconnected from ${username}` }, ...prev]);
  };

  return (
    <div className="live-connector">
      <div className="connection-panel">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={connected}
          placeholder="Enter TikTok username"
          className="username-input"
        />
        <button 
          onClick={connected ? handleDisconnect : handleConnect}
          className={connected ? 'disconnect-btn' : 'connect-btn'}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      <div className="stats-panel">
        <div className="stat">
          <span role="img" aria-label="Likes">❤️</span>
          <span>{likeCount}</span>
        </div>
        <div className="stat">
          <span role="img" aria-label="Gifts">🎁</span>
          <span>{giftCount}</span>
        </div>
      </div>

      <div className="notifications-container">
        <h3>Recent Activity</h3>
        <div className="notifications-list">
          {notifications.slice(0, 5).map((note, idx) => (
            <div key={`note-${idx}`} className="notification">
              {note.avatarUrl && (
                <img 
                  src={note.avatarUrl} 
                  alt="avatar" 
                  className="avatar"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <span className="notification-text">{note.message}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="event-log">
        <h3>Event Log</h3>
        <div className="log-entries">
          {logs.map((log, idx) => (
            <div key={`log-${idx}`} className="log-entry">
              {log.avatarUrl && (
                <img
                  src={log.avatarUrl}
                  alt="avatar"
                  className="avatar"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="log-message">{log.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveConnector;
