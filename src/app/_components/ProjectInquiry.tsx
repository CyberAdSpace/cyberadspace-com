"use client";

import { useEffect, useState, type FormEvent } from "react";

export default function ProjectInquiry() {
  const [draft, setDraft] = useState("");
  const [mailto, setMailto] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);

  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = [
      "Hi CyberAdSpace,",
      "",
      `Name: ${String(data.get("name")).trim()}`,
      `Email: ${String(data.get("email")).trim()}`,
      `Project: ${data.get("service")}`,
      "",
      String(data.get("brief")).trim(),
      "",
      "Please let me know the next steps to discuss this project.",
    ].join("\n");
    setDraft(body);
    setMailto(`mailto:Contact@CyberAdSpace.com?subject=${encodeURIComponent(`Project inquiry: ${data.get("service")}`)}&body=${encodeURIComponent(body)}`);
  }

  return (
    <form className="project-form" onSubmit={prepareEmail} onChange={() => { setDraft(""); setMailto(""); }}>
      <fieldset disabled={!ready}>
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
      <button className="btn btn-primary" type="submit">Prepare my project email <span aria-hidden>↗</span></button>
      </fieldset>
      <noscript><p className="form-help">Enable JavaScript to prepare a brief here, or email Contact@CyberAdSpace.com directly.</p></noscript>
      <p className="form-help">This creates an email draft below. Nothing is sent or saved by this form. You review and send it through your email app.</p>
      {draft && (
        <div className="email-draft" role="status">
          <h3>Your project email is ready.</h3>
          <p>Open the draft in your email app, or copy the text and email Contact@CyberAdSpace.com.</p>
          <textarea aria-label="Prepared project email" readOnly value={draft} rows={9} />
          <a className="btn btn-cyan" href={mailto}>Open email draft <span aria-hidden>↗</span></a>
          <p className="form-help">Not sent yet. Review your email and press Send in your email app.</p>
        </div>
      )}
    </form>
  );
}
