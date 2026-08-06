import prisma from "../prisma/client.js";
import bcrypt from "bcrypt";
import pubsub from "../pubsub/pubsub.js";
import validateTitle from "../utils/validateTitle.js";
import requireAdmin from "../auth/requireAdmin.js";
import { generateToken } from "../auth/jwt.js";


const Mutation = {
  addBook: async (_, { input }) => {
  validateTitle(input.title);

  const author = await prisma.author.findUnique({
    where: {
      id: input.authorId,
    },
  });

  if (!author) {
    throw new Error("Author not found");
  }

  const newBook = await prisma.book.create({
    data: {
      title: input.title,
      author: {
        connect: {
          id: input.authorId,
        },
      },
    },
  });

  await pubsub.publish("BOOK_ADDED", {
    bookAdded: newBook,
  });

  return newBook;
},
  

  updateBook: async (_, args) => {
  validateTitle(args.title);

  const existingBook = await prisma.book.findUnique({
    where: {
      id: args.id,
    },
  });

  if (!existingBook) {
    throw new Error("Book not found");
  }

  const updatedBook = await prisma.book.update({
    where: {
      id: args.id,
    },
    data: {
      title: args.title,
    },
  });

  return updatedBook;
},

  deleteBook: async (_, args, context) => {
  requireAdmin(context);

  const existingBook = await prisma.book.findUnique({
    where: {
      id: args.id,
    },
  });

  if (!existingBook) {
    throw new Error("Book not found");
  }

  const deletedBook = await prisma.book.delete({
    where: {
      id: args.id,
    },
  });

  return deletedBook;
},

  login: async (_, { username, password }) => {
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!user) {
  return {
    message: "Invalid username or password",
  };
}

const isValidPassword = await bcrypt.compare(
  password,
  user.password
);

if (!isValidPassword) {
  return {
    message: "Invalid username or password",
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