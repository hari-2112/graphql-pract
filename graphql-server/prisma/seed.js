
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();



async function main() {
  // Clear existing data
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.user.deleteMany();

  

  // Authors
  await prisma.author.createMany({
    data: [
      { id: "101", name: "Hari" },
      { id: "102", name: "Apollo" },
      { id: "103", name: "Steve" },
      { id: "104", name: "GraphQL" },
    ],
  });

  // Books
  await prisma.book.createMany({
    data: [
      { id: "1", title: "Learning GraphQL", authorId: "101" },
      { id: "2", title: "Apollo Server", authorId: "102" },
      { id: "3", title: "GraphQL Advanced", authorId: "101" },
      { id: "4", title: "Federation", authorId: "101" },
    ],
  });

  // Movies
 await prisma.movie.createMany({
  data: [
    {
      id: "201",
      title: "Inception",
      duration: 148,
    },
    {
      id: "202",
      title: "Interstellar",
      duration: 169,
    },
  ],
  skipDuplicates: true,
});

  const adminPassword = await bcrypt.hash("admin123", 10);
  const hariPassword = await bcrypt.hash("hari123", 10);

 // Users
await prisma.user.createMany({
  data: [
    {
      id: "1",
      username: "admin",
      password: adminPassword,
      role: "ADMIN",
    },
    {
      id: "2",
      username: "hari",
      password: hariPassword,
      role: "USER",
    },
  ],
  skipDuplicates: true,
});

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });