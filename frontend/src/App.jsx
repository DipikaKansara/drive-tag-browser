import { useEffect, useState } from "react";
import { loginUrl, scanFolder, getFacets } from "./api.js";
import FacetPicker from "./components/FacetPicker.jsx";
import FileList from "./components/FileList.jsx";

export default function App() {
  const [filters, setFilters] = useState({});
  const [files, setFiles] = useState([]);
  const [availableFacets, setAvailableFacets] = useState({});
  const [rootFolderId, setRootFolderId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  async function refresh(nextFilters) {
    try {
      const data = await getFacets(nextFilters);
      setFiles(data.files);
      setAvailableFacets(data.availableFacets);
      setError(null);
    } catch (e) {
      setError("Not logged in yet, or no data scanned. Log in and scan a folder to begin.");
    }
  }

  useEffect(() => {
    refresh(filters);
  }, []);

  function handleSelect(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    refresh(next);
  }

  function handleClear(key) {
    const next = { ...filters };
    delete next[key];
    setFilters(next);
    refresh(next);
  }

  async function handleScan() {
    if (!rootFolderId) return;
    setScanning(true);
    try {
      await scanFolder(rootFolderId, ["client", "task", "year"]);
      await refresh({});
      setFilters({});
    } catch (e) {
      setError("Scan failed: " + e.message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22 }}>Drive Tag Browser</h1>

      <div style={{ marginBottom: 24, padding: 12, background: "#f7f7f7", borderRadius: 8 }}>
        <a href={loginUrl()} style={{ marginRight: 16 }}>
          Log in with Google
        </a>
        <input
          placeholder="Root Drive folder ID"
          value={rootFolderId}
          onChange={(e) => setRootFolderId(e.target.value)}
          style={{ padding: 6, marginRight: 8 }}
        />
        <button onClick={handleScan} disabled={scanning}>
          {scanning ? "Scanning..." : "Scan folder"}
        </button>
      </div>

      {error && <p style={{ color: "#c00" }}>{error}</p>}

      <FacetPicker
        availableFacets={availableFacets}
        activeFilters={filters}
        onSelect={handleSelect}
        onClear={handleClear}
      />

      <FileList files={files} />
    </div>
  );
}
