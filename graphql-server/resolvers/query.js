import books from "../data/books.js";
import movies from "../data/movies.js";

const Query = {
  books: () => books,

  currentTime: () => new Date(),

  search: () => [...books, ...movies],
};

export default Query;