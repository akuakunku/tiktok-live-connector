type EventCallback = (type: string, data: any) => void;

let socket: WebSocket;

export function connectToServer(username: string, onEvent: EventCallback) {
  socket = new WebSocket('ws://localhost:3001');

  socket.onopen = () => {
    socket.send(JSON.stringify({ action: 'connect', username }));
  };

  socket.onmessage = (msg) => {
    const { type, data } = JSON.parse(msg.data);
    onEvent(type, data);
  };
}

export function disconnectFromServer() {
  socket?.close();
}
