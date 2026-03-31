import { useEffect, useRef, useState } from "react";

export default function useFoodSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const q = String(query || "").trim();

    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(`/.netlify/functions/food-search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal
        });

        if (!res.ok) {
          throw new Error(`Search failed: ${res.status}`);
        }

        const data = await res.json();

        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        if (requestIdRef.current === currentRequestId) {
          setResults(arr);
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Food search error:", err);
        }

        if (requestIdRef.current === currentRequestId) {
          setResults([]);
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return { results, loading };
}