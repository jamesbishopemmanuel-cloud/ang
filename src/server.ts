import app from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";

async function start() {
  try {
    await prisma.$connect();

    app.listen(
      config.port,
      "0.0.0.0",
      () => {
        console.log(
          `Veylora API running on port ${config.port}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Unable to start Veylora:",
      error
    );

    process.exit(1);
  }
}

start();

process.on(
  "SIGINT",
  async () => {
    await prisma.$disconnect();
    process.exit(0);
  }
);

process.on(
  "SIGTERM",
  async () => {
    await prisma.$disconnect();
    process.exit(0);
  }
);