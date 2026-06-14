import func2url from "../../backend/func2url.json";

const URLS = func2url as Record<string, string>;

function getToken(): string | null {
  return localStorage.getItem("ad_token");
}

async function call(
  fn: "auth" | "orders" | "products" | "admin",
  method: "GET" | "POST" | "PUT" | "DELETE",
  action: string | null,
  data?: Record<string, unknown>,
  qs?: Record<string, string>
): Promise<unknown> {
  const url = new URL(URLS[fn]);
  // _action всегда в query string
  if (action) url.searchParams.set("_action", action);
  if (qs) Object.entries(qs).forEach(([k, v]) => { if (k !== "_action") url.searchParams.set(k, v); });

  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Auth-Token"] = token;

  // _action тоже в body для POST/PUT
  const body = (method !== "GET" && method !== "DELETE" && data !== undefined)
    ? { ...data, ...(action ? { _action: action } : {}) }
    : undefined;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: unknown;
  try { json = await res.json(); } catch { json = {}; }

  if (!res.ok && res.status !== 401) {
    throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
  }
  return json;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const auth = {
  sendOtp: (phone: string) =>
    call("auth", "POST", "send-otp", { phone }) as Promise<{ success: boolean; dev_code?: string; phone: string }>,

  verifyOtp: (phone: string, code: string) =>
    call("auth", "POST", "verify-otp", { phone, code }) as Promise<{
      success: boolean; token: string;
      user: { id: number; phone: string; name: string | null; role: string };
    }>,

  logout: () => call("auth", "POST", "logout", {}),

  me: () => call("auth", "GET", "me") as Promise<{
    user: {
      id: number; phone: string; name: string | null; email: string | null;
      birth_date: string | null; role: string; addresses: Address[];
    };
  } | { error: string }>,

  updateProfile: (data: Partial<ProfileUpdate>) =>
    call("auth", "POST", "profile", data as Record<string, unknown>) as Promise<{ success: boolean }>,
};

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
export const products = {
  list: (category?: string) =>
    call("products", "GET", null, undefined, category ? { category } : undefined) as Promise<{
      products: Product[]; total: number;
    }>,

  promos: () =>
    call("products", "GET", "promos") as Promise<{ promos: Promo[] }>,

  stories: () =>
    call("products", "GET", "stories") as Promise<{ stories: Story[] }>,

  checkPromo: (code: string, subtotal: number) =>
    call("products", "POST", "check-promo", { code, subtotal }) as Promise<PromoCheckResult>,
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const orders = {
  create: (data: CreateOrderData) =>
    call("orders", "POST", null, data as unknown as Record<string, unknown>) as Promise<{
      success: boolean; order_id: number; total: number; discount: number; delivery_cost: number;
    }>,

  list: () =>
    call("orders", "GET", null) as Promise<{ orders: Order[]; total: number }>,

  get: (id: number) =>
    call("orders", "GET", String(id)) as Promise<{ order: Order }>,

  cancel: (orderId: number) =>
    call("orders", "POST", null, { order_id: orderId }, { _action: "cancel" }) as Promise<{
      success: boolean; status: string;
    }>,
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export const admin = {
  dashboard: () =>
    call("admin", "GET", "dashboard") as Promise<DashboardData>,

  // Заказы
  orders: (status?: string, search?: string) => {
    const qs: Record<string, string> = {};
    if (status) qs.status = status;
    if (search) qs.search = search;
    return call("admin", "GET", "orders", undefined, qs) as Promise<{ orders: Order[]; total: number }>;
  },

  updateOrderStatus: (orderId: number, status: OrderStatus) =>
    call("admin", "POST", "order_status", { order_id: orderId, status }) as Promise<{ success: boolean }>,

  // Товары
  products: () =>
    call("admin", "GET", "products") as Promise<{ products: Product[] }>,

  updateProduct: (id: number, data: Partial<Product>) =>
    call("admin", "POST", "product_update", { ...data, id }) as Promise<{ success: boolean }>,

  createProduct: (data: Partial<Product>) =>
    call("admin", "POST", "product_create", data as unknown as Record<string, unknown>) as Promise<{ success: boolean; id: number }>,

  // Акции
  promos: () =>
    call("admin", "GET", "promos") as Promise<{ promos: Promo[] }>,

  createPromo: (data: Partial<Promo>) =>
    call("admin", "POST", "promo_create", data as unknown as Record<string, unknown>) as Promise<{ success: boolean; id: number }>,

  updatePromo: (id: number, data: Partial<Promo>) =>
    call("admin", "POST", "promo_update", { ...data, id }) as Promise<{ success: boolean }>,

  // Клиенты
  users: () =>
    call("admin", "GET", "users") as Promise<{ users: AdminUser[] }>,

  // Stories
  stories: () =>
    call("admin", "GET", "stories") as Promise<{ stories: Story[] }>,

  createStory: (data: Partial<Story>) =>
    call("admin", "POST", "story_create", data as unknown as Record<string, unknown>) as Promise<{ success: boolean; id: number }>,

  updateStory: (id: number, data: Partial<Story>) =>
    call("admin", "POST", "story_update", { ...data, id }) as Promise<{ success: boolean }>,

  // Настройки сайта
  getSettings: () =>
    call("admin", "GET", "settings") as Promise<{ settings: Record<string, string> }>,

  updateSettings: (settings: Record<string, string>) =>
    call("admin", "POST", "settings_update", { settings }) as Promise<{ success: boolean; updated: number }>,
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface Product {
  id: number; name: string; description: string; composition: string;
  price: number; category: string; size: string; emoji: string;
  image_url: string | null; tags: string[]; is_available: boolean; sort_order: number;
}

export interface Promo {
  id: number; code: string | null; title: string; description: string;
  type: string; value: number; min_order: number; is_active: boolean;
  is_one_time: boolean; for_new_users: boolean; for_birthday: boolean; emoji: string;
}

export interface PromoCheckResult {
  valid: boolean; code: string; title: string; type: string; value: number; discount: number;
}

export interface Story {
  id: number; title: string; emoji: string; bg: string;
  image_url: string | null; content: string | null; button_text: string | null;
  button_link: string | null; is_active: boolean; sort_order: number; views: number;
}

export interface Address {
  id: number; address: string; apartment: string | null;
  entrance: string | null; floor: string | null; intercom: string | null; is_default: boolean;
}

export interface ProfileUpdate {
  name: string; email: string; birth_date: string;
  address: string; apartment: string; entrance: string; floor: string; intercom: string;
}

export type OrderStatus = "processing" | "accepted" | "delivering" | "delivered" | "cancelled";

export interface OrderItem {
  product_id: number; name: string; emoji: string; price: number; quantity: number; total: number;
}

export interface Order {
  id: number; user_id: number | null; status: OrderStatus; status_label: string;
  delivery_type: string; customer_name: string; customer_phone: string;
  address: string | null; apartment: string | null; entrance: string | null;
  floor: string | null; intercom: string | null; comment: string | null;
  delivery_time: string; payment_method: string; promo_code: string | null;
  discount: number; subtotal: number; delivery_cost: number; total: number;
  created_at: string; updated_at: string; items: OrderItem[];
}

export interface CreateOrderData {
  items: { product_id: number; name: string; emoji: string; price: number; quantity: number }[];
  customer_name: string; customer_phone: string; delivery_type: string;
  address?: string; apartment?: string; entrance?: string; floor?: string; intercom?: string;
  comment?: string; delivery_time?: string; payment_method?: string; promo_code?: string;
}

export interface AdminUser {
  id: number; phone: string; name: string | null; email: string | null;
  birth_date: string | null; role: string; created_at: string;
}

export interface DashboardData {
  stats: {
    total_orders: number; revenue: number; total_clients: number;
    new_orders: number; today_orders: number; today_revenue: number;
  };
  recent_orders: { id: number; name: string; phone: string; status: string; total: number; delivery_type: string; created_at: string }[];
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  processing: "В обработке",
  accepted:   "Готовится",
  delivering: "Курьер в пути",
  delivered:  "Доставлен",
  cancelled:  "Отмена",
};

export const STATUS_EMOJI: Record<OrderStatus, string> = {
  processing: "⏳",
  accepted:   "👨‍🍳",
  delivering: "🛵",
  delivered:  "✅",
  cancelled:  "❌",
};
