import { prisma } from "../utils/db.server";

export const loader = async () => {
  await prisma.$queryRaw`SELECT 1`;
  return new Response("ok", { status: 200 });
};
    