"use client";

import { useEffect, useState, type FormEvent } from "react";

type Status = { kind: "idle" | "sending" | "sent" | "error"; message?: string };

export default function ProjectInquiry() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => { setReady(true); }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || "We couldn't send your message. Please try again or email Contact@CyberAdSpace.com.");
      form.reset();
      setStatus({ kind: "sent" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "We couldn't send your message. Please email Contact@CyberAdSpace.com." });
    }
  }

  return (
    <form className="project-form" onSubmit={send}>
      <fieldset disabled={!ready || status.kind === "sending"}>
      <div className="form-row">
        <div><label htmlFor="project-name">Your name</label><input id="project-name" name="name" autoComplete="name" placeholder="Name" required maxLength={100} pattern=".*\S.*" /></div>
        <div><label htmlFor="project-email">Your email</label><input id="project-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={200} /></div>
      </div>
      <label htmlFor="project-service">What would you like to create?</label>
      <select id="project-service" name="service" defaultValue="" required>
        <option value="" disabled>Select a project type</option>
        <option>Brand + website</option><option>New brand or rebrand</option><option>New website or redesign</option><option>Let&apos;s explore my idea</option>
      </select>
      <label htmlFor="project-brief">Tell us about your idea</label>
      <textarea id="project-brief" name="brief" required minLength={15} maxLength={1800} rows={5} placeholder="What does your business do? What would you like to build? Include your current website, timing, or budget if you have them." />
      <div className="form-hp" aria-hidden="true"><label htmlFor="project-website">Leave this empty</label><input id="project-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <button className="btn btn-primary" type="submit">{status.kind === "sending" ? "Sending…" : <>Send my project <span aria-hidden>↗</span></>}</button>
      </fieldset>
      <noscript><p className="form-help">Enable JavaScript to send this form, or email Contact@CyberAdSpace.com directly.</p></noscript>
      <div role="status" aria-live="polite">
        {status.kind === "sent" && (
          <div className="email-draft">
            <h3>Thanks, your project is on its way.</h3>
            <p>We received your message at Contact@CyberAdSpace.com and will reply to the email you entered.</p>
          </div>
        )}
        {status.kind === "error" && <p className="form-error">{status.message}</p>}
      </div>
      <p className="form-help">Your message goes straight to our inbox at Contact@CyberAdSpace.com. See our <a href="/privacy.html">Privacy Policy</a>.</p>
    </form>
  );
}
