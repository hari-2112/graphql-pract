
import prisma from "../prisma/client.js";
import { unauthenticated } from "../utils/errors.js";
import { GraphQLError } from "graphql";

const Query = {
 books: async () => {
  return await prisma.book.findMany({
    include: {
      author: true,
    },
  });
},

movies: async () => {
  return prisma.movie.findMany();
},
  currentTime: () => new Date(),

  search: async () => {
  const books = await prisma.book.findMany({
    include: {
      author: true,
    },
  });

  const movies = await prisma.movie.findMany();

  return [...books, ...movies];
},

me: (_, __, { user }) => {
  console.log("Resolver received user:", user);

  if (!user) {
  throw new GraphQLError("Not authenticated", {
    extensions: {
      code: "UNAUTHENTICATED",
    },
  });
}

  return user;
},
};

export default Query;