export default function SkeletonCards() {
  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg overflow-hidden"
          style={{ background: "#141414", border: "1px solid #2A2A2A", borderLeft: "3px solid #2A2A2A" }}
        >
          <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: "#2A2A2A" }}>
            <div className="skeleton w-5 h-5 rounded" />
            <div className="skeleton w-28 h-3 rounded" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
              <div key={j} className="flex gap-3">
                <div className="flex-shrink-0 w-9">
                  <div className="skeleton w-8 h-6 rounded mb-1" />
                  <div className="skeleton w-6 h-2 rounded mx-auto" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 rounded w-3/4" />
                  <div className="skeleton h-2 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
