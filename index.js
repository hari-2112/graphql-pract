import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import DataLoader from "dataloader";

const typeDefs = `#graphql
type Query {
  books: [Book!]!
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
];

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

  Book: {
  author: (book, _, context) => {
    return context.authorLoader.load(book.authorId);
  },
}
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