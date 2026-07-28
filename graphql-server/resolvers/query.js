import books from "../data/books.js";
import movies from "../data/movies.js";

const Query = {
  books: () => books,

  currentTime: () => new Date(),

  search: () => [...books, ...movies],

  me: (_, __, { user }) => {
    if (!user) {
      throw new Error("Not authenticated");
    }

    return user;
  },
};

export default Query;