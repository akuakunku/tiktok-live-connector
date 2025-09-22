import { useState, useEffect, useRef } from 'react';
import { useGiftMapping } from "./giftMapping";

type ChatItem = {
  message: React.ReactNode;
  avatarUrl?: string;
};

type ActivityItem = {
  message: React.ReactNode;
  avatarUrl?: string;
};

type UserStats = {
  count: number;
  avatarUrl?: string;
  lastGift?: string;
};

const LiveConnector = () => {
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [chatLogs, setChatLogs] = useState<ChatItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [giftCount, setGiftCount] = useState(0);
  const [giftPopup, setGiftPopup] = useState<{ avatarUrl: string; user: string; giftName: string } | null>(null);
  const [topLikers, setTopLikers] = useState<Record<string, UserStats>>({});
  const [topGifters, setTopGifters] = useState<Record<string, UserStats>>({});
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [manualDisconnect, setManualDisconnect] = useState(false);
  const { giftMapping, setGiftMapping } = useGiftMapping();
  const likeBuffer = useRef<Record<string, number>>({});
  const likeTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!connected || !username) return;

    const socket = new WebSocket(
      process.env.NODE_ENV === 'development'
        ? 'ws://localhost:3001'
        : 'wss://tiktok-live-server-lk1p.onrender.com'
    );

    socket.onopen = () => {
      console.log('WebSocket connected');
      socket.send(JSON.stringify({ action: 'connect', username }));
      setChatLogs((prev) =>
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
      setChatLogs((prev) =>
        [{ message: '❌ WebSocket connection error' }, ...prev].slice(0, 200)
      );
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      if (connected && !manualDisconnect) {
        setChatLogs((prev) =>
          [{ message: '📡 Attempting to reconnect...' }, ...prev].slice(0, 200)
        );
        setTimeout(() => setConnected(true), 3000);
      }
    };

    setWs(socket);

    return () => {
      if (socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, [connected, username]);

  const flushLikes = () => {
    const entries = Object.entries(likeBuffer.current);
    if (entries.length > 0) {
      entries.forEach(([uid, count]) => {
        setActivities((prev) => [
          { message: `❤️ ${uid} liked the stream x${count}` },
          ...prev,
        ]);

        setTopLikers((prev) => {
          const updated = { ...prev };
          updated[uid] = {
            count: (updated[uid]?.count || 0) + count,
            avatarUrl: updated[uid]?.avatarUrl,
          };
          return updated;
        });
      });
      likeBuffer.current = {};
    }
    likeTimer.current = null;
  };

  const handleEvent = (type: string, data: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const avatarUrl = data?.user?.profilePicture?.url?.[0] || data?.profilePictureUrl || '';
    const uid = data?.uniqueId || '👻 unknown';

    switch (type) {
      case 'chat': {
        const message = (
          <span className="chat-message">
            [{timestamp}] 💬 <span className="username">{uid}</span>:
            <span className="comment"> {data.comment}</span>
          </span>
        );

        setChatLogs((prev) =>
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
          const count = data.repeatCount || 1;
          setGiftCount((prev) => prev + count);

          const giftId = data.giftId;
          const giftName =
            giftMapping[giftId] || data.giftName || `Unknown (${giftId})`;

          // auto add mapping
          if (!giftMapping[giftId] && data.giftName) {
            const updated = { ...giftMapping, [giftId]: data.giftName };
            setGiftMapping(updated);
            console.log(`✅ Gift baru ditambahkan: ${giftId} → ${data.giftName}`);
          }

          // update top gifters
          setTopGifters((prev) => {
            const updated = { ...prev };
            updated[uid] = {
              count: (updated[uid]?.count || 0) + count,
              avatarUrl,
              lastGift: giftName,
            };
            return updated;
          });

          // update activity
          setActivities((prev) => [
            { message: `🎁 ${uid} sent ${giftName} x${count}`, avatarUrl },
            ...prev,
          ]);

          // popup
          setGiftPopup({ avatarUrl, user: uid, giftName });
          setTimeout(() => setGiftPopup(null), 10000);
        }
        break;

      case 'like': {
        setLikeCount((prev) => prev + 1);
        likeBuffer.current[uid] = (likeBuffer.current[uid] || 0) + 1;

        setTopLikers((prev) => {
          const updated = { ...prev };
          updated[uid] = {
            count: (updated[uid]?.count || 0) + 1,
            avatarUrl,
          };
          return updated;
        });

        if (!likeTimer.current) {
          likeTimer.current = setTimeout(flushLikes, 3000);
        }
        break;
      }

      case 'end':
        setChatLogs((prev) =>
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
      setChatLogs((prev) =>
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

    likeBuffer.current = {};
    if (likeTimer.current) {
      clearTimeout(likeTimer.current);
      likeTimer.current = null;
    }

    setChatLogs((prev) =>
      [{ message: `🔌 Disconnected from ${username}` }, ...prev].slice(0, 200)
    );
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


      <div className="activity-log-wrapper">
        {/* Chat Section */}
        <div className="chat-log">
          <h3>Chat</h3>
          <div className="log-entries">
            {chatLogs.slice(-20).map((log, idx) => (
              <div key={`chat-${idx}`} className="log-entry">
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

        {/* Activities Section */}
        <div className="activities-container">
          <h3>Likes & Gifts</h3>
          <div className="notifications-list">
            {activities.slice(-20).map((note, idx) => (
              <div key={`activity-${idx}`} className="notification">
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
      <div className="stats">
  ❤️ Total Likes: {likeCount} | 🎁 Total Gifts: {giftCount}
</div>
      <div className="leaderboard">
        <div className="leaderboard-section">
          <h3>🏆 Top Likers</h3>
          <ul>
            {Object.entries(topLikers)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 10)
              .map(([user, data]) => (
                <li key={user} className="leaderboard-item">
                  {data.avatarUrl && (
                    <img src={data.avatarUrl} alt="avatar" className="avatar" />
                  )}
                  ❤️ {user}: {data.count}
                </li>
              ))}
          </ul>
        </div>

        <div className="leaderboard-section">
          <h3>🎁 Top Gifters</h3>
          <ul>
            {Object.entries(topGifters)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 10)
              .map(([user, data]) => (
                <li key={user} className="leaderboard-item">
                  {data.avatarUrl && (
                    <img src={data.avatarUrl} alt="avatar" className="avatar" />
                  )}
                  🎁 {user}: {data.count} ({data.lastGift})

                </li>
              ))}
          </ul>
        </div>
      </div>
      {giftPopup && (
        <div className="gift-popup">
          <img src={giftPopup.avatarUrl} alt="avatar" className="popup-avatar" />
          <div className="popup-text">
            🎁 {giftPopup.user} sent {giftPopup.giftName}!
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveConnector;
