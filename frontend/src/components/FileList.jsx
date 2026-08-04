export default function FileList({ files }) {
  if (files.length === 0) return <p style={{ color: "#888" }}>No files match this combination.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {files.map((f) => (
        <li
          key={f.id}
          style={{ padding: "10px 0", borderBottom: "1px solid #eee", display: "flex", flexDirection: "column" }}
        >
          <a href={f.web_view_link} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
            {f.name}
          </a>
          <span style={{ fontSize: 12, color: "#888" }}>
            {f.tags.map((t) => `${t.key}: ${t.value}`).join("  •  ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
