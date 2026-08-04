import prisma from "../lib/prisma.js";

import movies from "../data/movies.js";

const Query = {
 books: async () => {
  return await prisma.book.findMany({
    include: {
      author: true,
    },
  });
},
  currentTime: () => new Date(),

  search: async () => {
  const books = await prisma.book.findMany({
    include: {
      author: true,
    },
  });

  return [...books, ...movies];
},

 me: (_, __, { user }) => {
  console.log("Resolver user:", user);

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user;
},
};

export default Query;