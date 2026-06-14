import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface Suggestion {
  value: string;
  data?: { city?: string; street?: string; house?: string };
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}

// DaData public suggest endpoint — работает без ключа для базового саджеста
const DADATA_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";
const DADATA_KEY = ""; // Подставь ключ из DaData если есть, иначе работает mock

async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 3) return [];
  try {
    const body = {
      query: `Белгород, ${query}`,
      count: 5,
      locations: [{ city: "Белгород" }],
      restrict_value: true,
    };
    if (!DADATA_KEY) {
      // Фолбэк: возвращаем заготовленные подсказки белгородских улиц
      const streets = [
        "ул. Калинина", "ул. Победы", "ул. Преображенская", "пр. Богдана Хмельницкого",
        "ул. Народный бульвар", "ул. Гражданский пр-т", "ул. Есенина", "ул. Щорса",
        "ул. Костюкова", "ул. Студенческая", "ул. Сумская", "ул. Садовая",
        "ул. Белгородский пр-т", "ул. Волчанская", "ул. 5 Августа",
      ];
      const q = query.toLowerCase();
      return streets
        .filter(s => s.toLowerCase().includes(q))
        .slice(0, 5)
        .map(s => ({ value: `г. Белгород, ${s}` }));
    }
    const res = await fetch(DADATA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Token ${DADATA_KEY}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return (data.suggestions || []) as Suggestion[];
  } catch {
    return [];
  }
}

export default function AddressInput({ value, onChange, placeholder = "Улица, дом", error }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (v.length >= 2) {
        setLoading(true);
        const list = await fetchSuggestions(v);
        setSuggestions(list);
        setOpen(list.length > 0);
        setLoading(false);
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
  };

  const select = (s: Suggestion) => {
    // Extract just the street+house part if starts with city
    const clean = s.value.replace(/^г\.\s*Белгород,?\s*/i, "");
    onChange(clean);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          className={`input-dark w-full px-4 py-3 text-sm pr-10 ${error ? "border-red-500/50" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading
            ? <Icon name="Loader2" size={14} className="animate-spin text-ad-cream/30" />
            : <Icon name="MapPin" size={14} className="text-ad-cream/30" />
          }
        </div>
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d2010] border border-ad-orange/15 rounded-2xl overflow-hidden shadow-xl z-50">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-3 text-sm text-ad-cream/80 hover:bg-white/5 hover:text-ad-cream border-b border-white/5 last:border-0 transition-colors flex items-center gap-2"
              onClick={() => select(s)}
            >
              <Icon name="MapPin" size={13} className="text-ad-orange flex-shrink-0" />
              <span className="truncate">{s.value}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
