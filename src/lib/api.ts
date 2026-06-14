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
  if (qs) Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
  if (action) url.searchParams.set("_action", action);

  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Auth-Token"] = token;

  const body = data ? { ...data, _action: action } : undefined;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok && res.status !== 401) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
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
    call("auth", "POST", "profile", data) as Promise<{ success: boolean }>,
};

// ─── PRODUCTS ────────────────────────────────────────────────────────────────
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

  partner: (data: PartnerData) =>
    call("products", "POST", "partner", data as unknown as Record<string, unknown>) as Promise<{ success: boolean; id: number }>,
};

// ─── ORDERS ──────────────────────────────────────────────────────────────────
export const orders = {
  create: (data: CreateOrderData) =>
    call("orders", "POST", null, data as unknown as Record<string, unknown>) as Promise<{
      success: boolean; order_id: number; total: number; discount: number; delivery_cost: number;
    }>,

  list: () =>
    call("orders", "GET", null) as Promise<{ orders: Order[]; total: number }>,

  get: (id: number) =>
    call("orders", "GET", String(id)) as Promise<{ order: Order }>,

  updateStatus: (id: number, status: OrderStatus) =>
    call("orders", "PUT", "status", { status }, { id: String(id) }) as Promise<{ success: boolean }>,
};

// ─── ADMIN ───────────────────────────────────────────────────────────────────
export const admin = {
  dashboard: () =>
    call("admin", "GET", "dashboard") as Promise<DashboardData>,

  orders: (status?: string, search?: string) => {
    const qs: Record<string, string> = { _action: "orders" };
    if (status) qs.status = status;
    if (search) qs.search = search;
    return call("admin", "GET", "orders", undefined, qs) as Promise<{ orders: Order[]; total: number }>;
  },

  updateOrderStatus: (id: number, status: OrderStatus) =>
    call("admin", "PUT", "orders", { status }, { id: String(id), sub: "status" }) as Promise<{ success: boolean }>,

  products: () =>
    call("admin", "GET", "products") as Promise<{ products: Product[] }>,

  updateProduct: (id: number, data: Partial<Product>) =>
    call("admin", "PUT", "products", { ...data, id }) as Promise<{ success: boolean }>,

  promos: () =>
    call("admin", "GET", "promos") as Promise<{ promos: Promo[] }>,

  createPromo: (data: Partial<Promo>) =>
    call("admin", "POST", "promos", data as unknown as Record<string, unknown>) as Promise<{ success: boolean; id: number }>,

  updatePromo: (id: number, data: Partial<Promo>) =>
    call("admin", "PUT", "promos", { ...data, id }) as Promise<{ success: boolean }>,

  partners: () =>
    call("admin", "GET", "partners") as Promise<{ partners: PartnerRequest[] }>,

  updatePartnerStatus: (id: number, status: string) =>
    call("admin", "PUT", "partners", { status, id }) as Promise<{ success: boolean }>,

  users: () =>
    call("admin", "GET", "users") as Promise<{ users: AdminUser[] }>,

  stories: () =>
    call("admin", "GET", "stories") as Promise<{ stories: Story[] }>,

  updateStory: (id: number, data: Partial<Story>) =>
    call("admin", "PUT", "stories", { ...data, id }) as Promise<{ success: boolean }>,
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
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

export interface PartnerData {
  place_name: string; phone: string; email?: string; comment?: string;
}

export interface PartnerRequest {
  id: number; place_name: string; phone: string; email: string | null;
  comment: string | null; status: string; created_at: string;
}

export interface AdminUser {
  id: number; phone: string; name: string | null; email: string | null;
  birth_date: string | null; role: string; created_at: string;
}

export interface DashboardData {
  stats: {
    total_orders: number; revenue: number; total_clients: number;
    new_orders: number; new_partners: number;
  };
  recent_orders: { id: number; name: string; phone: string; status: string; total: number; created_at: string }[];
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  processing: "Принимается",
  accepted: "Готовится",
  delivering: "Курьер в пути",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

export const STATUS_EMOJI: Record<OrderStatus, string> = {
  processing: "⏳",
  accepted: "👨‍🍳",
  delivering: "🛵",
  delivered: "✅",
  cancelled: "❌",
};
