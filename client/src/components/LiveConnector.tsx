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
  const [manualDisconnect, setManualDisconnect] = useState(false);

  // Handle WebSocket connection
  useEffect(() => {
    if (!connected || !username) return;

    const socket = new WebSocket(
      process.env.NODE_ENV === 'development'
        ? 'ws://localhost:3001'
        : 'wss://tiktok-live-connector-snay.onrender.com'
    );

    socket.onopen = () => {
      console.log('WebSocket connected');
      socket.send(
        JSON.stringify({
          action: 'connect',
          username,
        })
      );
      setLogs((prev) =>
        [{ message: `🔗 Connected to ${username}` }, ...prev].slice(0, 200)
      );
    };

    socket.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        handleEvent(type, data);
      } catch (err) {
        console.error('Invalid WS message:', event.data);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setLogs((prev) =>
        [{ message: '❌ WebSocket connection error' }, ...prev].slice(0, 200)
      );
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      if (connected && !manualDisconnect) {
        setLogs((prev) =>
          [{ message: '📡 Attempting to reconnect...' }, ...prev].slice(0, 200)
        );
        setTimeout(() => setConnected(true), 3000);
      }
    };

    setWs(socket);

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        setLogs((prev) =>
          [
            { message, avatarUrl },
            ...(data.comment?.trim().toLowerCase() === '!help'
              ? [{ message: `📢 ${uid} requested help`, avatarUrl }]
              : []),
            ...prev,
          ].slice(0, 200)
        );
        break;
      }

      case 'gift':
        if (data.repeatEnd) {
          setGiftCount((prev) => prev + (data.repeatCount || 1));
          setNotifications((prev) => [
            {
              message: `🎁 ${uid} sent ${data.giftName || 'a gift'} x${
                data.repeatCount || 1
              }`,
              avatarUrl,
            },
            ...prev,
          ]);
        }
        break;

      case 'like':
        setLikeCount((prev) => prev + 1);
        setNotifications((prev) => [
          {
            message: `❤️ ${uid} liked the stream`,
            avatarUrl,
          },
          ...prev,
        ]);
        break;

      case 'follow':
        setNotifications((prev) => [
          {
            message: `👤 ${uid} followed`,
            avatarUrl,
          },
          ...prev,
        ]);
        break;

      case 'share':
        setNotifications((prev) => [
          {
            message: `🔁 ${uid} shared the stream`,
            avatarUrl,
          },
          ...prev,
        ]);
        break;

      case 'end':
        setLogs((prev) =>
          [{ message: '🚫 Live stream ended' }, ...prev].slice(0, 200)
        );
        setConnected(false);
        break;

      default:
        console.log('Unhandled event:', type, data);
    }
  };

  const handleConnect = () => {
    if (!username.trim()) {
      setLogs((prev) =>
        [{ message: '⚠️ Please enter a username' }, ...prev].slice(0, 200)
      );
      return;
    }
    setManualDisconnect(false);
    setConnected(true);
  };

  const handleDisconnect = () => {
    setManualDisconnect(true);
    if (ws) {
      ws.send(JSON.stringify({ action: 'disconnect' }));
      ws.close();
    }
    setConnected(false);
    setLogs((prev) =>
      [{ message: `🔌 Disconnected from ${username}` }, ...prev].slice(0, 200)
    );
    setTimeout(() => setManualDisconnect(false), 1000); // reset flag
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

      <div className="status-indicator">
        Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div className="stats-panel">
        <div className="stat">
          <span role="img" aria-label="Likes">
            ❤️
          </span>
          <span>{likeCount}</span>
        </div>
        <div className="stat">
          <span role="img" aria-label="Gifts">
            🎁
          </span>
          <span>{giftCount}</span>
        </div>
      </div>

      <div className="activity-log-wrapper">
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
      </div>
    </div>
  );
};

export default LiveConnector;
