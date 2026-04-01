import { useEffect, useState } from "react";

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
  // Δοκιμάζει κοινές λέξεις χωρίς τόνο και επιστρέφει με τόνο
  const map = {
    "φετα": "φέτα",
    "γιαουρτι": "γιαούρτι",
    "κοτοπουλο": "κοτόπουλο",
    "ψωμι": "ψωμί",
    "τυρι": "τυρί",
    "γαλα": "γάλα",
    "αυγα": "αυγά",
    "ελαιολαδο": "ελαιόλαδο",
    "μελι": "μέλι",
    "ζαχαρη": "ζάχαρη",
    "αλατι": "αλάτι",
    "ρυζι": "ρύζι",
    "μακαρονια": "μακαρόνια",
    "πατατες": "πατάτες",
    "ντοματες": "ντομάτες",
    "κρεμμυδι": "κρεμμύδι",
    "σκορδο": "σκόρδο",
    "λαδι": "λάδι",
    "βουτυρο": "βούτυρο",
    "μοσχαρι": "μοσχάρι",
    "αρνι": "αρνί",
    "χοιρινο": "χοιρινό",
    "ψαρι": "ψάρι",
    "σολομος": "σολομός",
    "τονος": "τόνος",
    "σαρδελες": "σαρδέλες",
    "καφες": "καφές",
    "τσαι": "τσάι",
    "χυμος": "χυμός",
    "μπιρα": "μπύρα",
    "κρασι": "κρασί",
    "νερο": "νερό",
  };
  return map[str.toLowerCase()] || str;
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

        // Στέλνουμε και τις δύο εκδοχές παράλληλα
        const queries = new Set([q, qNoAccents, qWithAccents]);
        
        const allResults = await Promise.all(
          [...queries].map((searchQ) =>
            fetch(`/.netlify/functions/food-search?q=${encodeURIComponent(searchQ)}`)
              .then((res) => res.ok ? res.json() : [])
              .catch(() => [])
          )
        );

        if (cancelled) return;

        // Merge και deduplicate
        const seen = new Set();
        const merged = allResults.flat().filter((food) => {
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