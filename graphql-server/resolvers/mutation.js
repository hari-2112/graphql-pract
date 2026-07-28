import books from "../data/books.js";
import authors from "../data/authors.js";
import users from "../data/users.js";
import pubsub from "../pubsub/pubsub.js";
import validateTitle from "../utils/validateTitle.js";
import requireAdmin from "../auth/requireAdmin.js";
import { generateToken } from "../auth/jwt.js";

const Mutation = {
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

    const token = generateToken(user);

    return {
      token,
      user,
    };
  },
};

export default Mutation;