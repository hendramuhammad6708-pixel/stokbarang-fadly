export default function Loading() {
  return (
    <div className="animate-pulse" role="status" aria-label="Memuat">
      <div className="mb-2 h-7 w-36 rounded bg-line" />
      <div className="mb-6 h-4 w-52 rounded bg-line/70" />
      <div className="panel divide-y divide-line">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex h-16 items-center justify-between px-4">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-line" />
              <div className="h-3 w-24 rounded bg-line/70" />
            </div>
            <div className="h-6 w-10 rounded bg-line" />
          </div>
        ))}
      </div>
    </div>
  );
}
