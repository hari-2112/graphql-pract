// Paste your Apollo Server GraphQL code here.

import { createApolloServer } from "./server/createApolloServer.js";
import express from "express";
import http from "http";
import { expressMiddleware } from "@as-integrations/express5";
import buildContext from "./context/context.js";
import resolvers from "./resolvers/index.js";
import pubsub from "./pubsub/pubsub.js";
import books from "./data/books.js";
import movies from "./data/movies.js";
import { setupWebSocket } from "./websocket/setupWebSocket.js";
import { createSchema } from "./schema/createSchema.js";
import { env } from "./config/env.js";

import prisma from "./lib/prisma.js";

async function testPrisma() {
  const books = await prisma.book.findMany({
    include: {
      author: true,
    },
  });

  console.log("📚 Books from Prisma:");
  console.log(books);
}

testPrisma();

const schema = createSchema();

const app = express();

const httpServer = http.createServer(app);

const requestedPort = env.PORT;
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



const server = createApolloServer({
  schema,
  httpServer,
  getServerCleanup: () => serverCleanup,
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