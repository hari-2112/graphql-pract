import prisma from "../prisma/client.js";
import bcrypt from "bcrypt";
import pubsub from "../pubsub/pubsub.js";
import validateTitle from "../utils/validateTitle.js";
import requireAdmin from "../auth/requireAdmin.js";
import { generateToken } from "../auth/jwt.js";
import { registerSchema, loginSchema } from "../validation/authValidation.js";
import {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
} from "../auth/refreshTokenService.js";

import {
  badUserInput,
  notFound,
} from "../utils/errors.js";


const Mutation = {
  addBook: async (_, { input }, context) => {
  requireAdmin(context);

  validateTitle(input.title);

  const author = await prisma.author.findUnique({
    where: {
      id: input.authorId,
    },
  });

  if (!author) {
    notFound("Author not found");
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
  

  updateBook: async (_, args, context) => {
  requireAdmin(context);

  validateTitle(args.title);

  const existingBook = await prisma.book.findUnique({
    where: {
      id: args.id,
    },
  });

  if (!existingBook) {
    notFound("Book not found");
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
    notFound("Book not found");
  }

  const deletedBook = await prisma.book.delete({
    where: {
      id: args.id,
    },
  });

  return deletedBook;
},

  login: async (_, { username, password }) => {
    const result = loginSchema.safeParse({
      username,
      password,
    });

  if (!result.success) {
  badUserInput(result.error.issues[0].message);
}

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
const refreshToken = await createRefreshToken(user.id);

return {
  token,
  refreshToken,
  user,
};
},

logout: async (_, { refreshToken }) => {
  await revokeRefreshToken(refreshToken);

  return {
    success: true,
  };
},

register: async (_, { username, password }) => {

   const result = registerSchema.safeParse({
    username,
    password,
  });

  if (!result.success) {
  badUserInput(result.error.issues[0].message);
}
  // 1. Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (existingUser) {
    return {
      message: "Username already exists",
    };
  }

  // 2. Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Create the user
  const user = await prisma.user.create({
  data: {
    username,
    password: hashedPassword,
    role: "USER",
  },
});

  // 4. Generate JWT
 const token = generateToken(user);
const refreshToken = await createRefreshToken(user.id);

return {
  token,
  refreshToken,
  user,
};
},

refreshToken: async (_, { refreshToken }) => {
  const storedToken = await findRefreshToken(refreshToken);

  if (!storedToken) {
    return {
      message: "Invalid refresh token",
    };
  }

  if (storedToken.revokedAt) {
    return {
      message: "Refresh token has been revoked",
    };
  }

  if (storedToken.expiresAt <= new Date()) {
    return {
      message: "Refresh token has expired",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: storedToken.userId,
    },
  });

  if (!user) {
    return {
      message: "User not found",
    };
  }

  // Rotate the refresh token
  await revokeRefreshToken(refreshToken);

  const token = generateToken(user);
  const newRefreshToken = await createRefreshToken(user.id);

  return {
    token,
    refreshToken: newRefreshToken,
    user,
  };
},

};

export default Mutation;