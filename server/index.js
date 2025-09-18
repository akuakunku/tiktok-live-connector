const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("ws");
const { TikTokLiveConnection } = require("tiktok-live-connector");

// Route utama untuk health-check (hindari error 502 di Render)
app.get("/", (req, res) => {
  res.send("✅ TikTok Live Connector running");
});

// Helper untuk pastikan data user aman
function withSafeUser(data) {
  return {
    ...data,
    uniqueId: data?.uniqueId || data?.user?.uniqueId || "anonymous",
  };
}

// Setup WebSocket server
const wss = new Server({ server: http });

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  let connection = null;

  ws.on("message", async (msg) => {
    try {
      const parsed = JSON.parse(msg);

      if (parsed.action === "connect" && parsed.username) {
        console.log(`[TikTok] Connecting to ${parsed.username}`);

        connection = new TikTokLiveConnection(parsed.username);

        connection
          .connect()
          .then(() => {
            console.log(`[TikTok] Connected to ${parsed.username}`);
          })
          .catch((err) => {
            console.error("[TikTok] Connection failed:", err);
            ws.send(
              JSON.stringify({
                type: "error",
                data: { message: "Failed to connect" },
              })
            );
          });

        const forward = (type) => (data) => {
          ws.send(JSON.stringify({ type, data: withSafeUser(data) }));
        };

        // Forward TikTok events ke client WebSocket
        connection.on("chat", forward("chat"));
        connection.on("gift", forward("gift"));
        connection.on("like", forward("like"));
        connection.on("follow", forward("follow"));
        connection.on("share", forward("share"));
        connection.on("viewer", forward("viewer"));
        connection.on("streamEnd", () => {
          ws.send(JSON.stringify({ type: "end" }));
        });
      }
    } catch (err) {
      console.error("[WS] Invalid message:", msg);
    }
  });

  ws.on("close", () => {
    console.log("[WS] Client disconnected");
    if (connection) {
      connection.disconnect();
      connection = null;
    }
  });
});

// Gunakan PORT dari Render atau default ke 3001 untuk lokal
const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
