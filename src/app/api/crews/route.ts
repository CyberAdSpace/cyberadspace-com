import { after } from "next/server";
import { allCrews, ensureCrews, runDue, storageReady, toPublic } from "@/lib/crews";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Public: every project's crew, agent status and approved work. */
export async function GET() {
  if (!storageReady()) return Response.json({ crews: [] });
  try {
    let crews = await allCrews();
    if (!crews.length) {
      // First visit after launch: send every project through the system. Only free site checks run from here;
      // writing agents wait for the scheduled job or an admin.
      await ensureCrews();
      crews = await allCrews();
      after(() => runDue(0, true).then(() => undefined));
    }
    return Response.json({ crews: crews.map(toPublic) }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
  } catch {
    return Response.json({ crews: [] });
  }
}
