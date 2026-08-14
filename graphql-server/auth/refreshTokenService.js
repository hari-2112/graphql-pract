import prisma from "../prisma/client.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "./refreshToken.js";

const REFRESH_TOKEN_DAYS = 7;

export async function createRefreshToken(userId) {
  const rawToken = generateRefreshToken();
  const hashedToken = hashRefreshToken(rawToken);

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.refreshToken.create({
    data: {
      token: hashedToken,
      userId,
      expiresAt,
    },
  });

  return rawToken;
}

export async function findRefreshToken(rawToken) {
  const hashedToken = hashRefreshToken(rawToken);

  return prisma.refreshToken.findUnique({
    where: {
      token: hashedToken,
    },
  });
}

export async function revokeRefreshToken(rawToken) {
  const hashedToken = hashRefreshToken(rawToken);

  return prisma.refreshToken.update({
    where: {
      token: hashedToken,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}