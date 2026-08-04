import DataLoader from "dataloader";
import prisma from "../prisma/client.js";

export default function createAuthorLoader() {
  return new DataLoader(async (authorIds) => {
    const authors = await prisma.author.findMany({
      where: {
        id: {
          in: [...authorIds],
        },
      },
    });

    const authorMap = new Map(
      authors.map((author) => [author.id, author])
    );

    return authorIds.map((id) => authorMap.get(id) || null);
  });
}