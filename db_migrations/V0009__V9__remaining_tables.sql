CREATE TABLE IF NOT EXISTS t_p97754588_arte_deli_site.promo_usages (id SERIAL PRIMARY KEY, promo_id INTEGER, user_id INTEGER, order_id INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE IF NOT EXISTS t_p97754588_arte_deli_site.stories (id SERIAL PRIMARY KEY, title VARCHAR(100) NOT NULL, emoji VARCHAR(10) DEFAULT '🍕', bg_gradient VARCHAR(100) DEFAULT 'from-orange-600 to-red-700', image_url TEXT, content TEXT, button_text VARCHAR(50), button_link TEXT, is_active BOOLEAN DEFAULT TRUE, sort_order INTEGER DEFAULT 0, views INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE IF NOT EXISTS t_p97754588_arte_deli_site.partner_requests (id SERIAL PRIMARY KEY, place_name VARCHAR(100) NOT NULL, phone VARCHAR(20) NOT NULL, email VARCHAR(100), comment TEXT, status VARCHAR(20) DEFAULT 'new', created_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE IF NOT EXISTS t_p97754588_arte_deli_site.reviews (id SERIAL PRIMARY KEY, user_id INTEGER, order_id INTEGER, author_name VARCHAR(100) NOT NULL, rating INTEGER NOT NULL, text TEXT NOT NULL, is_approved BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW());

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON t_p97754588_arte_deli_site.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON t_p97754588_arte_deli_site.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON t_p97754588_arte_deli_site.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON t_p97754588_arte_deli_site.sessions(token);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON t_p97754588_arte_deli_site.otp_codes(phone);
