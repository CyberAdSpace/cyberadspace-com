"use client";

import { useState } from "react";

export default function NotifyForm() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [email, setEmail] = useState("");

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email) return;
          // Placeholder — swap for real endpoint later
          setStatus("sent");
        }}
        className="reveal flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@somewhere.com"
          disabled={status === "sent"}
          className="flex-1 px-4 py-3 mono text-sm"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            color: "var(--text)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          className="btn btn-primary justify-center"
          disabled={status === "sent"}
        >
          {status === "sent" ? "You're on the list" : "Notify Me"}
        </button>
      </form>

      <p
        className="mono text-[10px] tracking-[0.25em] mt-6"
        style={{ color: "var(--text-faint)" }}
      >
        {status === "sent"
          ? "SEE YOU AT SHOWTIME."
          : "NO SPAM · NO SHARE · JUST FILMS"}
      </p>
    </>
  );
}
