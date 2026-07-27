// Paste your Apollo Server GraphQL code here.
import { ApolloServerPluginLandingPageLocalDefault }
  from "@apollo/server/plugin/landingPage/default";
import { ApolloServer } from "@apollo/server";
import express from "express";
import http from "http";
import { expressMiddleware } from "@as-integrations/express5";
import createAuthorLoader from "./loaders/authorLoader.js";
import jwt from "jsonwebtoken";
import DateTimeScalar from "./scalars/dateTime.js";
import pubsub from "./pubsub/pubsub.js";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import books from "./data/books.js";
import authors from "./data/authors.js";
import movies from "./data/movies.js";
import users from "./data/users.js";
import typeDefs from "./schema/typeDefs.js";
import requireAdmin from "./auth/requireAdmin.js";

const JWT_SECRET = "mySuperSecretKey";



function validateTitle(title) {
  if (!title.trim()) {
    throw new Error("Title cannot be empty");
  }
}




function buildContext({ req, connectionParams } = {}) {
  const authHeader =
    connectionParams?.authorization ||
    connectionParams?.Authorization ||
    req?.headers?.authorization ||
    req?.headers?.Authorization ||
    "";

  let user = null;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    try {
      user = jwt.verify(token, JWT_SECRET);
      console.log("Decoded User:", user);
    } catch (err) {
      console.log("JWT Error:", err.message);
      user = null;
    }
  }

  return {
    authorLoader: createAuthorLoader(),
    user,
  };
}




const resolvers = {

  DateTime: DateTimeScalar,
  Query: {
  books: () => books,

  currentTime: () => new Date(),

  search: () => {
    return [...books, ...movies];
  },
},

 Mutation: {
  addBook: (_, { input }) => {
    validateTitle(input.title);

    const authorExists = authors.some(
      (author) => author.id === input.authorId
    );

    if (!authorExists) {
      throw new Error("Author not found");
    }

    const newBook = {
      id: String(books.length + 1),
      title: input.title,
      authorId: input.authorId,
    };

    books.push(newBook);

    console.log("Publishing book event:", newBook);
    pubsub.publish("BOOK_ADDED", {
      bookAdded: newBook,
    });

    return newBook;
  },


  updateBook: (_, args) => {
  const book = books.find((b) => b.id === args.id);

  if (!book) {
    throw new Error("Book not found");
  }

  validateTitle(args.title);

  book.title = args.title;

  return book;
},

 deleteBook: (_, args, context) => {
   requireAdmin(context);

    const index = books.findIndex((b) => b.id === args.id);

    if (index === -1) {
      throw new Error("Book not found");
    }

    const deletedBook = books[index];

    books.splice(index, 1);

    return deletedBook;
  },

  login: (_, { username, password }) => {
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      return {
      message: "Invalid credentials",
    };
  }
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "10h" }
    );

    return {
      token,
      user,
    };
  },

},

  Subscription: {
  bookAdded: {
    subscribe: () => pubsub.asyncIterableIterator("BOOK_ADDED"),
  },
},

SearchItem: {
  __resolveType(obj) {
    if ("authorId" in obj) {
      return "Book";
    }

    if ("duration" in obj) {
      return "Movie";
    }

    return null;
  },
},

LoginResult: {
  __resolveType(obj) {
    if (obj.token) {
      return "LoginSuccess";
    }

    if (obj.message) {
      return "AuthError";
    }

    return null;
  },
},

Book: {
  author: (book, _, context) => {
    console.log("Author resolver executed");

    return context.authorLoader.load(book.authorId);
  },
}
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const app = express();

const httpServer = http.createServer(app);

const requestedPort = Number(process.env.PORT || 5000);
const fallbackPorts = [requestedPort, requestedPort + 1, requestedPort + 2, 0];
let serverCleanup = null;
let websocketSetupComplete = false;

const setupWebSocket = () => {
  if (websocketSetupComplete) {
    return;
  }

  websocketSetupComplete = true;

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  console.log("✅ WebSocket server created");

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/graphql")) {
      console.log("🔥 WebSocket handshake received", {
        url: request.url,
        upgrade: request.headers.upgrade,
        protocol: request.headers["sec-websocket-protocol"],
      });
    }
  });

  wsServer.on("connection", (socket, request) => {
    console.log("✅ WebSocket client connected", {
      url: request?.url,
      protocol: request?.headers["sec-websocket-protocol"],
      readyState: socket.readyState,
    });
  });

  serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => buildContext({ connectionParams: ctx.connectionParams }),
    },
    wsServer
  );
};

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
  httpServer.listen(port, "0.0.0.0", () => {
    const address = httpServer.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    setupWebSocket();
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
await server.start();

app.use(express.json());

app.get("/", (_, res) => res.redirect("/graphql"));

app.use("/graphql", (req, res, next) => {
  if (req.headers.upgrade === "websocket") {
    console.log("🔥 GraphQL upgrade request received", {
      method: req.method,
      url: req.url,
      upgrade: req.headers.upgrade,
      connection: req.headers.connection,
      protocol: req.headers["sec-websocket-protocol"],
    });
  }

  next();
});

app.use(
  "/graphql",
  expressMiddleware(server, {
    context: async ({ req }) => buildContext({ req }),
  })
);

startServer();