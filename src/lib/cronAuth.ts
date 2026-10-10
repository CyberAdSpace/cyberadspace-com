/** Same secret Vercel Cron sends; also used by Cyber Ad Space's own review tools. */
export function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}
