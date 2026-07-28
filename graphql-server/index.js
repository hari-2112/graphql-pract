// Paste your Apollo Server GraphQL code here.
import { ApolloServerPluginLandingPageLocalDefault }
  from "@apollo/server/plugin/landingPage/default";
import { ApolloServer } from "@apollo/server";
import express from "express";
import http from "http";
import { expressMiddleware } from "@as-integrations/express5";
import buildContext from "./context/context.js";
import resolvers from "./resolvers/index.js";
import pubsub from "./pubsub/pubsub.js";

import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import books from "./data/books.js";
import movies from "./data/movies.js";
import typeDefs from "./schema/typeDefs.js";
import { setupWebSocket } from "./websocket/setupWebSocket.js";




const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const app = express();

const httpServer = http.createServer(app);

const requestedPort = Number(process.env.PORT || 5000);
const fallbackPorts = [requestedPort, requestedPort + 1, requestedPort + 2, 0];
let serverCleanup = null;




const startServer = (attemptIndex = 0) => {
  const port = fallbackPorts[attemptIndex];

  const onError = (err) => {
    if (err.code === "EADDRINUSE" && attemptIndex < fallbackPorts.length - 1) {
      const nextPort = fallbackPorts[attemptIndex + 1];
      console.warn(`Port ${port} is busy, trying ${nextPort} instead.`);
      httpServer.removeListener("error", onError);
      startServer(attemptIndex + 1);
      return;
    }

    throw err;
  };

  
  httpServer.once("error", onError);
  serverCleanup = setupWebSocket(httpServer, schema);
  httpServer.listen(port, "0.0.0.0", () => {
    const address = httpServer.address();
    const actualPort =
      typeof address === "object" && address ? address.port : port;

    

    console.log(`🚀 Server ready at http://localhost:${actualPort}/graphql`);
    console.log(`🔌 WebSocket endpoint at ws://localhost:${actualPort}/graphql`);
  });
};

const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({
      httpServer,
    }),

    ApolloServerPluginLandingPageLocalDefault({
      embed: true,
    }),

    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});
async function main() {
  await server.start();

  app.use(express.json());

  app.get("/", (_, res) => {
    res.redirect("/graphql");
  });

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => buildContext({ req }),
    })
  );

  startServer();
}

main();