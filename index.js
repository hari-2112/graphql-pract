import { ApolloServer } from "@apollo/server";
import express from "express";
import http from "http";
import { expressMiddleware } from "@as-integrations/express5";
import DataLoader from "dataloader";
import jwt from "jsonwebtoken";
import { GraphQLScalarType, Kind } from "graphql";
import { PubSub } from "graphql-subscriptions";

const typeDefs = `#graphql

scalar DateTime

enum Role {
  ADMIN
  USER
}

type User {
  id: ID!
  username: String!
  role: Role!
}

type LoginSuccess {
  token: String!
  user: User!
}

type AuthError {
  message: String!
}
union LoginResult = LoginSuccess | AuthError

interface SearchItem {
  id: ID!
  title: String!
}

type Query {
  books: [Book!]!
  currentTime: DateTime!
  search: [SearchItem!]!
}

input AddBookInput {
  title: String!
  authorId: ID!
}

type Mutation {
  addBook(input: AddBookInput!): Book!
  updateBook(id: ID!, title: String!): Book!
  deleteBook(id: ID!): Book!
  login(username: String!, password: String!): LoginResult!
}

type Subscription {
  bookAdded: Book!
}

type Book implements SearchItem {
  id: ID!
  title: String!
  author: Author!
}

type Movie implements SearchItem {
  id: ID!
  title: String!
  duration: Int!
}

type Author {
  name: String!
}
`;

const books = [
  {
    id: "1",
    title: "Learning GraphQL",
    authorId: "101",
  },
  {
    id: "2",
    title: "Apollo Server",
    authorId: "102",
  },
  {
    id: "3",
    title: "GraphQL Advanced",
    authorId: "101",
  },
  {
    id: "4",
    title: "Federation",
    authorId: "101",
  },
];

const movies = [
  {
    id: "201",
    title: "Inception",
    duration: 148,
  },
  {
    id: "202",
    title: "Interstellar",
    duration: 169,
  },
];

const authors = [
  {
    id: "101",
    name: "Hari",
  },
  {
    id: "102",
    name: "Apollo",
  },
  {
    id: "103",
    name: "Steve",
  },
  {
    id: "104",
    name: "GraphQL",
  },
];

const users = [
  {
    id: "1",
    username: "admin",
    password: "admin123",
    role: "ADMIN",
  },
  {
    id: "2",
    username: "hari",
    password: "hari123",
    role: "USER",
  },
];

const JWT_SECRET = "mySuperSecretKey";
const pubsub = new PubSub();

function validateTitle(title) {
  if (!title.trim()) {
    throw new Error("Title cannot be empty");
  }
}

function createAuthorLoader() {
  return new DataLoader(async (authorIds) => {
    console.log("Loading authors:", authorIds);

    return authorIds.map((id) =>
      authors.find((author) => author.id === id)
    );
  });
}

function requireAdmin(context) {
  if (!context.user) {
    throw new Error("Not authenticated");
  }

  if (context.user.role !== "ADMIN") {
    throw new Error("Access denied");
  }
}

const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",

  description: "Custom DateTime scalar",

  serialize(value) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("Invalid DateTime");
    }
  
    return value.toISOString();
  },

  parseValue(value) {
    const date = new Date(value);
  
    if (isNaN(date.getTime())) {
      throw new Error("Invalid DateTime");
    }
  
    return date;
  },

  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

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
    subscribe: () => pubsub.asyncIterator(["BOOK_ADDED"]),
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

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await server.start();

const app = express();

const httpServer = http.createServer(app);

app.use(express.json());

app.use(
  "/graphql",
  expressMiddleware(server, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || "";

      let user = null;

      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        try {
          user = jwt.verify(token, JWT_SECRET);
          console.log("Decoded User:", user);
        } catch (err) {
          console.log("JWT Error:", err.message);
        }
      }

      return {
        authorLoader: createAuthorLoader(),
        user,
      };
    },
  })
);

httpServer.listen(4000, () => {
  console.log("🚀 Server ready at http://localhost:4000/graphql");
});

