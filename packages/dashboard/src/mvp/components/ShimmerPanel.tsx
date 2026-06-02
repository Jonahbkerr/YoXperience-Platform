export function ShimmerPanel() {
  return (
    <div
      style={{
        border: '1px solid #e4e8ec',
        borderRadius: 8,
        padding: 14,
        marginBottom: 10,
        background: 'white',
      }}
    >
      <div className="yxp-shimmer" style={{ height: 14, width: '45%', borderRadius: 4, marginBottom: 10 }} />
      <div className="yxp-shimmer" style={{ height: 10, width: '80%', borderRadius: 4, marginBottom: 6 }} />
      <div className="yxp-shimmer" style={{ height: 10, width: '65%', borderRadius: 4, marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="yxp-shimmer" style={{ height: 28, width: 110, borderRadius: 6 }} />
        <div className="yxp-shimmer" style={{ height: 28, width: 90, borderRadius: 6 }} />
      </div>
    </div>
  );
}
