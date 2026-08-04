
import prisma from "../prisma/client.js";

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
  console.log("Resolver user:", user);

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user;
},
};

export default Query;