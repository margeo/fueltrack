import { useEffect, useState } from "react";

export default function useFoodSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cleanQuery = query?.trim() || "";

    if (cleanQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `/.netlify/functions/food-search?q=${encodeURIComponent(cleanQuery)}`
        );

        if (!res.ok) {
          throw new Error(`Function request failed: ${res.status}`);
        }

        const data = await res.json();

        if (!cancelled) {
          setResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Food search error:", err);

        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return { results, loading };
}