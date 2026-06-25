export default function SkeletonTimeline() {
  return (
    <div className="flex gap-2 overflow-x-hidden">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 rounded-lg overflow-hidden"
          style={{ width: 120, background: "#141414", border: "1px solid #2A2A2A" }}
        >
          <div className="px-2 py-2 border-b text-center space-y-1.5" style={{ borderColor: "#2A2A2A" }}>
            <div className="skeleton w-8 h-5 rounded mx-auto" />
            <div className="skeleton w-6 h-2 rounded mx-auto" />
          </div>
          <div className="p-1.5 space-y-1.5">
            {i % 3 !== 2 && <div className="skeleton w-full h-8 rounded" />}
            {i % 4 === 0 && <div className="skeleton w-full h-8 rounded" />}
          </div>
        </div>
      ))}
    </div>
  );
}
