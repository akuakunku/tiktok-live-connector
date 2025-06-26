import { useState } from 'react';
import { connectToServer, disconnectFromServer } from '../services/wsClient';

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

  const handleEvent = (type: string, data: any) => {
    const avatarUrl = data?.user?.profilePicture?.url?.[0] || '';
    const uid = data?.uniqueId || '👻 unknown';
    let message: React.ReactNode = ''; 

    switch (type) {
      case 'chat': {
        const msg = data.comment?.trim().toLowerCase() || '';
        let extra = '';
        if (msg === '!help') {
          extra = `📢 ${uid} requested help.`;
        } else if (msg === '!spin') {
          extra = `🎲 ${uid} spun the wheel!`;
        }
        message = (
          <span>
            💬 <span className="username">{uid}</span>: <span className="comment">{data.comment}</span>
          </span>
        );

        setLogs(prev => [
          { message, avatarUrl },
          ...(extra ? [{ message: extra, avatarUrl }] : []),
          ...prev
        ]);
        return;
      }
      case 'gift':
        message = `🎁 ${uid} sent ${data.giftName || 'a gift'} x${data.repeatCount || 1}`;
        setGiftCount(prev => prev + (data.repeatCount || 1));
        break;
      case 'like':
        message = `❤️ ${uid} liked the stream`;
        setLikeCount(prev => prev + 1);
        break;
      case 'follow':
        message = `👤 ${uid} followed`;
        break;
      case 'share':
        message = `🔁 ${uid} shared the stream`;
        break;
      case 'end':
        message = `🚫 Live has ended`;
        break;
      default:
        message = `${type}: ${JSON.stringify(data)}`;
    }

    const newNotification = { message, avatarUrl };
    setNotifications(prev => [...prev, newNotification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== newNotification));
    }, 5000);
  };

  const handleConnect = () => {
    if (!username) return;
    setConnected(true);
    connectToServer(username, handleEvent);
  };

  const handleDisconnect = () => {
    disconnectFromServer();
    setConnected(false);
    setLogs(prev => [{ message: `🔌 Disconnected from ${username}` }, ...prev]);
  };

  return (
    <div className="live-connector">
      <input
        type="text"
        value={username}
        onChange={e => setUsername(e.target.value)}
        disabled={connected}
        placeholder="TikTok Username"
      />
      <button onClick={connected ? handleDisconnect : handleConnect}>
        {connected ? 'Disconnect' : 'Connect'}
      </button>

      <div className="stats">
        <div className="stat-item">❤️ Likes: {likeCount}</div>
        <div className="stat-item">🎁 Gifts: {giftCount}</div>
      </div>

      <div className="notification-container">
        {notifications.map((note, idx) => (
          <div key={idx} className="notification">
            {note.avatarUrl && (
              <img src={note.avatarUrl} alt="avatar" className="avatar small" />
            )}
            <span>{note.message}</span>
          </div>
        ))}
      </div>

      <div className="log-area">
        {logs.map((log, idx) => (
          <div key={idx} className="log-entry">
            {log.avatarUrl && (
              <img src={log.avatarUrl} alt="avatar" className="avatar" />
            )}
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveConnector;
