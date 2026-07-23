import { createMiddleware } from "hono/factory";
import { auth, ADMIN_EMAIL_ALLOWLIST } from "../auth";

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
});

/** Requires a signed-in session whose email is on the admin allowlist. */
export const requireAdminAuth = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const email = session?.user?.email;
  if (!email || !ADMIN_EMAIL_ALLOWLIST.includes(email)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});
