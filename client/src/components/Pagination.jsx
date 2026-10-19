export default function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-ghost" disabled={!meta.hasPrevPage} onClick={() => onChange(meta.page - 1)}>
        ← Prev
      </button>
      <span className="muted">
        Page {meta.page} of {meta.totalPages}
      </span>
      <button className="btn btn-ghost" disabled={!meta.hasNextPage} onClick={() => onChange(meta.page + 1)}>
        Next →
      </button>
    </nav>
  );
}
