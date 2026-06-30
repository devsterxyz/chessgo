import "dotenv/config";
import { defineConfig } from "prisma/config";

declare const process: {
  env: {
    DATABASE_URL?: string;
  };
};

const datasource = process.env["DATABASE_URL"]
  ? { url: process.env["DATABASE_URL"] }
  : {};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource,
});
