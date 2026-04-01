import { useEffect, useState } from "react";

export default function useFoodSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `/.netlify/functions/food-search?q=${encodeURIComponent(q)}`
        );

        if (!res.ok) throw new Error(`Search failed: ${res.status}`);

        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];

        if (!cancelled) setResults(arr);
      } catch (err) {
        console.error("Food search error:", err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return { results, loading };
}