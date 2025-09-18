type EventCallback = (type: string, data: any) => void;

let socket: WebSocket | null = null;

export function connectToServer(username: string, onEvent: EventCallback) {
  const url = import.meta.env.VITE_WS_URL;
  socket = new WebSocket(url);
  

  socket.onopen = () => {
    socket?.send(JSON.stringify({ action: "connect", username }));
  };

  socket.onmessage = (msg) => {
    try {
      const { type, data } = JSON.parse(msg.data);
      onEvent(type, data);
    } catch (err) {
      console.error("Invalid WS message:", msg.data);
    }
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  socket.onclose = () => {
    console.log("WebSocket closed");
  };
}

export function disconnectFromServer() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
