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
        // Παράλληλα USDA+OFF και FatSecret
        const [mainRes, fatSecretRes] = await Promise.all([
          fetch(`/.netlify/functions/food-search?q=${encodeURIComponent(q)}`)
            .then((res) => res.ok ? res.json() : [])
            .catch(() => []),
          fetch(`/.netlify/functions/fatsecret-search?q=${encodeURIComponent(q)}`)
            .then((res) => res.ok ? res.json() : [])
            .catch(() => [])
        ]);

        if (cancelled) return;

        const mainArr = Array.isArray(mainRes) ? mainRes : [];
        const fatSecretArr = Array.isArray(fatSecretRes) ? fatSecretRes : [];

        // Deduplicate
        const seen = new Set();
        const merged = [...mainArr, ...fatSecretArr].filter((food) => {
          const key = `${String(food.name || "").trim().toLowerCase()}|${String(food.brand || "").trim().toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setResults(merged);
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