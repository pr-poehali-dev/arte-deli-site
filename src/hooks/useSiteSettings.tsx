import { useState, useEffect } from "react";
import { admin } from "@/lib/api";

interface SiteSettings {
  hero_image_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_btn1: string;
  hero_btn2: string;
  logo_text: string;
  logo_image_url: string;
  phone: string;
  address: string;
  email: string;
  vk_url: string;
  work_hours_open: string;
  work_hours_close: string;
  delivery_free_from: string;
  delivery_cost: string;
  [key: string]: string;
}

const DEFAULTS: SiteSettings = {
  hero_image_url: "https://cdn.poehali.dev/projects/2f8cc4dc-0c5c-4aba-b2ad-7ae7a8eb6cb1/files/45930abd-2f75-4f8a-8333-be6fa88839bc.jpg",
  hero_title: "Горячая пицца ARTE DELI",
  hero_subtitle: "Сочная, ароматная, прямо из печи — доставим горячей до вашей двери",
  hero_btn1: "Заказать сейчас",
  hero_btn2: "Смотреть акции 🔥",
  logo_text: "ARTE DELI",
  logo_image_url: "",
  phone: "+7 (995) 138-03-31",
  address: "Белгород, ул. Калинина, 3",
  email: "food@artedeli.ru",
  vk_url: "https://vk.com/artedeli",
  work_hours_open: "10:00",
  work_hours_close: "22:00",
  delivery_free_from: "800",
  delivery_cost: "99",
};

let cache: SiteSettings | null = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(cache || DEFAULTS);
  const [loaded, setLoaded] = useState(!!cache);

  useEffect(() => {
    if (cache) return;
    admin.getSettings()
      .then(res => {
        const merged = { ...DEFAULTS, ...res.settings };
        cache = merged as SiteSettings;
        setSettings(merged as SiteSettings);
        setLoaded(true);
      })
      .catch(() => { setLoaded(true); });
  }, []);

  return { settings, loaded };
}
