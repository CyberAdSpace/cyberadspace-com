import Link from "next/link";
import { isAdmin, adminConfigured } from "@/lib/admin";
import { listOrders, blobConfigured, out, STATUS_LABEL, type NamesOut } from "@/lib/orders";
import { aiConfigured } from "@/lib/ai";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brand orders | CyberAdSpace", robots: { index: false, follow: false } };


export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!(await isAdmin())) {
    return (
      <main id="main-content" className="site-shell section-space admin-page">
        <h1 className="display admin-title">Brand orders</h1>
        {!adminConfigured() && <p className="form-error">Set ADMIN_PASSWORD in Vercel to turn on this dashboard.</p>}
        <form method="post" action="/api/admin/login" className="project-form admin-login">
          <label htmlFor="pw">Password</label>
          <input id="pw" name="password" type="password" autoComplete="current-password" required />
          <button className="btn btn-primary" type="submit">Sign in</button>
          {error && <p className="form-error">That password didn&apos;t work.</p>}
        </form>
      </main>
    );
  }

  const orders = blobConfigured() ? await listOrders() : [];
  const needs = orders.filter((o) => o.status === "review" || o.status === "failed" || o.status === "awaiting_payment");
  return (
    <main id="main-content" className="site-shell section-space admin-page">
      <div className="admin-head">
        <h1 className="display admin-title">Brand orders</h1>
        <form method="post" action="/api/admin/login"><input type="hidden" name="logout" value="1" /><button className="text-link" type="submit">Sign out</button></form>
      </div>
      <ul className="admin-checks">
        <li className={blobConfigured() ? "ok" : "bad"}>Order storage {blobConfigured() ? "connected" : "not connected (BLOB_READ_WRITE_TOKEN)"}</li>
        <li className={aiConfigured() ? "ok" : "bad"}>AI {aiConfigured() ? "connected" : "not connected: running in MOCK mode (add OPENAI_API_KEY)"}</li>
        <li className={stripeConfigured() ? "ok" : "warn"}>Card checkout {stripeConfigured() ? "on" : "off: orders wait for you to mark them paid"}</li>
        <li className={process.env.SMTP_USER ? "ok" : "bad"}>Email alerts {process.env.SMTP_USER ? "on" : "off"}</li>
      </ul>
      <p className="admin-summary">{orders.length} order{orders.length === 1 ? "" : "s"} · {needs.length} need{needs.length === 1 ? "s" : ""} you</p>
      {orders.length === 0 ? (
        <p className="start-fine">No orders yet. The order form is at <Link href="/start">/start</Link>.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Brand</th><th>Customer</th><th>Status</th><th>Paid</th><th>Created</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`}>{out<NamesOut>(o, "names")?.selected ?? o.intake.idea.slice(0, 48) + (o.intake.idea.length > 48 ? "…" : "")}</Link>{o.mock && <span className="pill warn">mock</span>}</td>
                <td>{o.customer.name}</td>
                <td><span className={`pill s-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                <td>{o.paid ? o.paidVia ?? "Yes" : "No"}</td>
                <td>{new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
