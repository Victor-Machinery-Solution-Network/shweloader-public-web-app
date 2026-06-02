/**
 * Static skeleton for the /browse Suspense fallback. Paints a full filter rail +
 * listings grid instantly (instead of a blank box) while the server streams the
 * real, filtered results — big perceived-performance win on navigation. Pure
 * markup reusing the existing `.skel-*` styles, so it ships inside the static
 * PPR shell with zero data dependency.
 */
export function BrowseSkeleton() {
  return (
    <div className="brz" aria-busy="true" aria-label="Loading listings">
      <div className="container brz-pagehead">
        <div className="brz-pagehead-l">
          <div className="skel-line" style={{ width: 84, height: 11 }} />
          <div
            className="skel-line"
            style={{ width: 240, height: 30, marginTop: 12, borderRadius: 8 }}
          />
        </div>
      </div>

      <div className="container brz-layout">
        <aside className="brz-skel-aside" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, g) => (
            <div key={g} style={{ marginBottom: 26 }}>
              <div
                className="skel-line"
                style={{ width: 130, height: 12, marginBottom: 14 }}
              />
              {Array.from({ length: 4 }).map((_, r) => (
                <div
                  key={r}
                  className="skel-line"
                  style={{
                    height: 14,
                    marginBottom: 12,
                    width: `${85 - r * 12}%`,
                  }}
                />
              ))}
            </div>
          ))}
        </aside>

        <section className="brz-results">
          <div className="brz-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skel-card">
                <div className="skel-img" />
                <div className="skel-body">
                  <div className="skel-line" />
                  <div className="skel-line" style={{ width: "65%" }} />
                  <div className="skel-price" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
