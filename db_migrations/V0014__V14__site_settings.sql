CREATE TABLE IF NOT EXISTS t_p97754588_arte_deli_site.site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO t_p97754588_arte_deli_site.site_settings (key, value) VALUES
('hero_image_url', 'https://cdn.poehali.dev/projects/2f8cc4dc-0c5c-4aba-b2ad-7ae7a8eb6cb1/files/45930abd-2f75-4f8a-8333-be6fa88839bc.jpg'),
('hero_title', 'Горячая пицца ARTE DELI'),
('hero_subtitle', 'Сочная, ароматная, прямо из печи — доставим горячей до вашей двери'),
('hero_btn1', 'Заказать сейчас'),
('hero_btn2', 'Смотреть акции'),
('logo_text', 'ARTE DELI'),
('logo_image_url', ''),
('phone', '+7 (995) 138-03-31'),
('address', 'Белгород, ул. Калинина, 3'),
('email', 'food@artedeli.ru'),
('vk_url', 'https://vk.com/artedeli'),
('work_hours_open', '10:00'),
('work_hours_close', '22:00'),
('delivery_free_from', '800'),
('delivery_cost', '99'),
('min_order', '0')
