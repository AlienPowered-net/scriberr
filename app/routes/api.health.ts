import { json } from "@remix-run/node";

export const loader = async () => {
  // Dynamic imports for server-only modules
  const [{ prisma }] = await Promise.all([
    import("../utils/db.server"),
  ]);

  await prisma.$queryRaw`SELECT 1`;
  return new Response("ok", { status: 200 });
};
