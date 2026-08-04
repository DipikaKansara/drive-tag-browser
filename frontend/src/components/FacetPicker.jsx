export default function FacetPicker({ availableFacets, activeFilters, onSelect, onClear }) {
  const activeKeys = Object.keys(activeFilters);

  return (
    <div style={{ marginBottom: 24 }}>
      {activeKeys.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {activeKeys.map((key) => (
            <span
              key={key}
              style={{
                display: "inline-block",
                background: "#e8e8e8",
                borderRadius: 12,
                padding: "4px 10px",
                marginRight: 8,
                fontSize: 13,
              }}
            >
              {key}: <strong>{activeFilters[key]}</strong>{" "}
              <button
                onClick={() => onClear(key)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#888" }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {Object.entries(availableFacets).map(([key, values]) => {
        if (activeFilters[key]) return null; // already filtered on this facet
        return (
          <div key={key} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>
              {key}
            </div>
            <div>
              {values.map((v) => (
                <button
                  key={v}
                  onClick={() => onSelect(key, v)}
                  style={{
                    marginRight: 8,
                    marginBottom: 6,
                    padding: "4px 12px",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
