// src/hooks/useFoodSearch.js
import { useEffect, useState } from "react";
import { getCached, setCache } from "../utils/foodCache";

function removeAccents(str) {
  return str
    .replace(/ά/g, "α").replace(/έ/g, "ε").replace(/ή/g, "η")
    .replace(/ί/g, "ι").replace(/ό/g, "ο").replace(/ύ/g, "υ")
    .replace(/ώ/g, "ω").replace(/ϊ/g, "ι").replace(/ϋ/g, "υ")
    .replace(/ΐ/g, "ι").replace(/ΰ/g, "υ").replace(/Ά/g, "Α")
    .replace(/Έ/g, "Ε").replace(/Ή/g, "Η").replace(/Ί/g, "Ι")
    .replace(/Ό/g, "Ο").replace(/Ύ/g, "Υ").replace(/Ώ/g, "Ω");
}

function addAccents(str) {
  const map = {
    "φετα": "φέτα", "γιαουρτι": "γιαούρτι", "κοτοπουλο": "κοτόπουλο",
    "ψωμι": "ψωμί", "τυρι": "τυρί", "γαλα": "γάλα", "αυγα": "αυγά",
    "ελαιολαδο": "ελαιόλαδο", "μελι": "μέλι", "ζαχαρη": "ζάχαρη",
    "αλατι": "αλάτι", "ρυζι": "ρύζι", "μακαρονια": "μακαρόνια",
    "πατατες": "πατάτες", "ντοματες": "ντομάτες", "κρεμμυδι": "κρεμμύδι",
    "σκορδο": "σκόρδο", "λαδι": "λάδι", "βουτυρο": "βούτυρο",
    "μοσχαρι": "μοσχάρι", "αρνι": "αρνί", "χοιρινο": "χοιρινό",
    "ψαρι": "ψάρι", "σολομος": "σολομός", "τονος": "τόνος",
    "σαρδελες": "σαρδέλες", "καφες": "καφές", "τσαι": "τσάι",
    "χυμος": "χυμός", "μπιρα": "μπύρα", "κρασι": "κρασί", "νερο": "νερό",
  };
  return map[str.toLowerCase()] || str;
}

async function fetchFromAPI(searchQ) {
  const res = await fetch(`/.netlify/functions/food-search?q=${encodeURIComponent(searchQ)}`);
  if (!res.ok) return [];
  return res.json();
}

function mergeAndDedupe(arrays) {
  const seen = new Set();
  return arrays.flat().filter((food) => {
    const key = `${String(food.name || "").trim().toLowerCase()}|${String(food.brand || "").trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
        const qNoAccents = removeAccents(q);
        const qWithAccents = addAccents(qNoAccents);
        const cacheKey = q.toLowerCase();

        // 1. Έλεγχος cache — αν υπάρχει επιστρέφει instant
        const cached = await getCached(cacheKey);
        if (cached && !cancelled) {
          setResults(cached);
          setLoading(false);
          return;
        }

        // 2. Cache miss → API calls
        const queries = [...new Set([q, qNoAccents, qWithAccents])];
        const allResults = await Promise.all(
          queries.map((searchQ) => fetchFromAPI(searchQ).catch(() => []))
        );

        if (cancelled) return;

        const merged = mergeAndDedupe(allResults);

        // 3. Αποθήκευση στο cache για επόμενη φορά
        if (merged.length > 0) {
          setCache(cacheKey, merged);
        }

        setResults(merged);
      } catch {
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