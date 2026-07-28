import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import buildContext from "../context/context.js";

export function setupWebSocket(httpServer, schema) {
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  console.log("✅ WebSocket server created");

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) =>
        buildContext({
          connectionParams: ctx.connectionParams,
        }),
    },
    wsServer
  );

  wsServer.on("connection", () => {
    console.log("🔥 WebSocket client connected");
  });

  return serverCleanup;
}