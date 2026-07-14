import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import DataLoader from "dataloader";

const typeDefs = `#graphql
type Query {
  books: [Book!]!
}

type Mutation {
  addBook(title: String!, authorId: String!): Book!
  updateBook(id: String!, title: String!): Book!
}

type Book {
  title: String!
  author: Author!
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

const resolvers = {
  Query: {
    books: () => books,
  },

 Mutation: {
  addBook: (_, args) => {
   validateTitle(args.title);

    const authorExists = authors.some(
      (author) => author.id === args.authorId
    );

    if (!authorExists) {
      throw new Error("Author not found");
    }

    const newBook = {
      id: String(books.length + 1),
      title: args.title,
      authorId: args.authorId,
    };

    books.push(newBook);

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
},

 Book: {
  author: (book, _, context) => {
    return context.authorLoader.load(book.authorId);
  },
},
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },

  context: async () => ({
    authorLoader: createAuthorLoader(),
  }),
});

console.log(`🚀 Server ready at: ${url}`);