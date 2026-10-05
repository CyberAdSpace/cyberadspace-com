import Link from "next/link";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order received | CyberAdSpace", robots: { index: false } };

export default async function Thanks({ searchParams }: { searchParams: Promise<{ id?: string; t?: string }> }) {
  const { id, t } = await searchParams;
  const card = stripeConfigured();
  return (
    <main id="main-content" className="creation-home start-page">
      <section className="site-shell section-space thanks">
        <div className="eyebrow">Order received</div>
        <h1 className="display start-title">Thank you.<br /><span>Your brand is on its way.</span></h1>
        {card ? (
          <p className="start-lede">Your payment went through. Our agent is building your brand now, and a person on our team reviews everything before it comes to you. Expect an email within 72 hours.</p>
        ) : (
          <p className="start-lede">We&apos;ll email you shortly with how to pay. As soon as payment is confirmed, our agent starts building, and a person reviews everything before it comes to you.</p>
        )}
        {id && t && <p><Link className="btn btn-primary" href={`/order/${id}?t=${encodeURIComponent(t)}`}>Check your order status <span aria-hidden>↗</span></Link></p>}
        <p className="start-fine">Save that link; it&apos;s also in your confirmation email. Questions? Contact@CyberAdSpace.com</p>
      </section>
    </main>
  );
}
