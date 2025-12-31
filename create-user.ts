import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create user for marcosremar
  const passwordHash = await bcrypt.hash("marcos123", 10);

  const user = await prisma.user.upsert({
    where: { email: "marcosremar@gmail.com" },
    update: {},
    create: {
      email: "marcosremar@gmail.com",
      name: "Marcos",
      passwordHash,
      emailVerified: new Date(),
      subscriptionStatus: "PRO",
    },
  });

  console.log("User created:", user.email);

  // Create a sample project for the user
  const project = await prisma.project.upsert({
    where: { storageKey: `${user.id}/marcos-thesis` },
    update: {},
    create: {
      userId: user.id,
      name: "Tese do Marcos",
      description: "Projeto de tese pessoal",
      title: "Título da Tese",
      subtitle: "Subtítulo Opcional",
      author: "Marcos",
      university: "Universidade Federal",
      degree: "Doutorado",
      language: "pt-BR",
      storageKey: `${user.id}/marcos-thesis`,
    },
  });

  console.log("Project created:", project.name);

  // Create sample metadata file
  await prisma.projectFile.upsert({
    where: {
      projectId_path: {
        projectId: project.id,
        path: "metadata.yaml",
      },
    },
    update: {},
    create: {
      projectId: project.id,
      path: "metadata.yaml",
      name: "metadata.yaml",
      type: "YAML",
      content: `title: "Título da Tese"
subtitle: "Subtítulo Opcional"
author: "Marcos"
university: "Universidade Federal"
degree: "Doutorado em Ciência da Computação"
date: "2024"
language: pt-BR
`,
      sizeBytes: Buffer.byteLength(`title: "Título da Tese"
subtitle: "Subtítulo Opcional"
author: "Marcos"
university: "Universidade Federal"
degree: "Doutorado em Ciência da Computação"
date: "2024"
language: pt-BR
`, "utf8"),
    },
  });

  console.log("Metadata file created");

  console.log("\n✅ User created successfully!");
  console.log("\nLogin credentials:");
  console.log("  Email: marcosremar@gmail.com");
  console.log("  Password: marcos123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
