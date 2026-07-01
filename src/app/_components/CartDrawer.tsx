"use client";

import { useCart } from "./CartContext";

export default function CartDrawer() {
  const { items, remove, clear, open, setOpen } = useCart();

  // Group items by brand so we can send shoppers to each brand's shop
  const groups = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.brandSlug] ||= []).push(item);
    return acc;
  }, {});

  return (
    <>
      {/* Scrim */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden={!open}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(4, 6, 13, 0.7)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          backdropFilter: "blur(4px)",
        }}
      />
      {/* Panel */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md flex flex-col"
        style={{
          background: "var(--bg-panel)",
          borderLeft: "1px solid var(--border-strong)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 400ms cubic-bezier(0.2, 0.7, 0.2, 1)",
        }}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="eyebrow">Your Manifest</div>
            <div className="display text-white font-bold text-xl mt-1">
              {items.length} {items.length === 1 ? "item" : "items"}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="nav-link"
            aria-label="Close cart"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4" style={{ opacity: 0.4 }}>🛰️</div>
              <p className="mono text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
                YOUR CART IS EMPTY
              </p>
              <p className="text-sm mt-3 max-w-xs mx-auto" style={{ color: "var(--text-faint)" }}>
                Add products from any of our brands. Each brand ships from its own store.
              </p>
            </div>
          ) : (
            Object.entries(groups).map(([slug, groupItems]) => (
              <div key={slug} className="mb-8">
                <div
                  className="mono text-[10px] tracking-[0.3em] mb-3 pb-2"
                  style={{
                    color: groupItems[0].brandAccent,
                    borderBottom: `1px solid ${groupItems[0].brandAccent}30`,
                  }}
                >
                  {groupItems[0].brand.toUpperCase()}
                </div>
                {groupItems.map((item, i) => {
                  const globalIdx = items.indexOf(item);
                  return (
                    <div key={i} className="flex items-start justify-between py-2">
                      <div>
                        <div className="text-sm text-white">{item.name}</div>
                        <div className="mono text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                          {item.price}
                        </div>
                      </div>
                      <button
                        onClick={() => remove(globalIdx)}
                        className="text-xs"
                        style={{ color: "var(--text-faint)" }}
                        aria-label={`Remove ${item.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                {groupItems[0].shopUrl ? (
                  <a
                    href={groupItems[0].shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-cyan mt-3 w-full justify-center text-[10px]"
                  >
                    Check out at {groupItems[0].brand}
                    <span aria-hidden>↗</span>
                  </a>
                ) : (
                  <div
                    className="mono text-[10px] mt-3 px-3 py-3 text-center"
                    style={{
                      color: "var(--text-muted)",
                      border: "1px dashed var(--border-strong)",
                    }}
                  >
                    COMING SOON · WE&apos;LL EMAIL WHEN THIS BRAND OPENS
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t px-6 py-5" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-faint)" }}>
              Each brand ships from its own store, so checkout happens on that
              brand&apos;s site. Your manifest lives here in the meantime.
            </p>
            <button
              onClick={clear}
              className="mono text-[10px] tracking-widest"
              style={{ color: "var(--text-faint)" }}
            >
              CLEAR MANIFEST
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
