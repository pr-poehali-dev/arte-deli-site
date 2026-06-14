import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { admin as adminApi, Product, Promo, Story, Order, AdminUser, DashboardData, OrderStatus } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Icon from "@/components/ui/icon";

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { v: OrderStatus; label: string; color: string }[] = [
  { v: "processing", label: "⏳ В обработке",    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  { v: "accepted",   label: "👨‍🍳 Готовится",      color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { v: "delivering", label: "🛵 Курьер в пути",  color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { v: "delivered",  label: "✅ Доставлен",       color: "bg-green-500/20 text-green-300 border-green-500/30" },
  { v: "cancelled",  label: "❌ Отмена",          color: "bg-red-500/20 text-red-300 border-red-500/30" },
];
const sColor = (s: string) => STATUS_OPTIONS.find(x => x.v === s)?.color || "";
const sLabel = (s: string) => STATUS_OPTIONS.find(x => x.v === s)?.label || s;

type AdminTab = "dashboard" | "orders" | "products" | "promos" | "stories" | "settings" | "users";

// ── HELPER INPUT ──────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder = "", textarea = false }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; textarea?: boolean;
}) {
  const cls = "input-dark w-full px-3 py-2.5 text-sm";
  return (
    <div>
      <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-1 uppercase tracking-wider">{label}</label>
      {textarea
        ? <textarea className={`${cls} resize-none h-20`} placeholder={placeholder}
            value={String(value)} onChange={e => onChange(e.target.value)} />
        : <input type={type} className={cls} placeholder={placeholder}
            value={String(value)} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

// ── PRODUCT EDITOR MODAL ──────────────────────────────────────────────────────
function ProductEditor({ product, onSave, onClose }: {
  product: Partial<Product> | null;
  onSave: (data: Partial<Product>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>(product || {
    name: "", description: "", composition: "", price: 0,
    category: "pizza", size: "32 см", emoji: "🍕",
    image_url: "", tags: [], is_available: true, sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Product, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[400] modal-overlay flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-gradient-to-b from-[#0d2010] to-[#071507] rounded-t-3xl sm:rounded-3xl border border-ad-orange/10 max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-ad-cream text-lg">
              {product?.id ? "Редактировать товар" : "Новый товар"}
            </h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
              <Icon name="X" size={16} className="text-ad-cream/60" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Название *" value={form.name || ""} onChange={v => set("name", v)} /></div>
            <Field label="Цена (₽) *" value={form.price || ""} type="number" onChange={v => set("price", parseInt(v) || 0)} />
            <Field label="Эмодзи" value={form.emoji || "🍕"} onChange={v => set("emoji", v)} />
            <div className="col-span-2"><Field label="Описание" value={form.description || ""} onChange={v => set("description", v)} textarea /></div>
            <div className="col-span-2"><Field label="Состав" value={form.composition || ""} onChange={v => set("composition", v)} textarea /></div>
            <div className="col-span-2"><Field label="URL фото" value={form.image_url || ""} placeholder="https://..." onChange={v => set("image_url", v)} /></div>
            <Field label="Размер" value={form.size || "32 см"} onChange={v => set("size", v)} />
            <Field label="Сортировка" value={form.sort_order || 0} type="number" onChange={v => set("sort_order", parseInt(v) || 0)} />
            <div className="col-span-2">
              <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-1 uppercase tracking-wider">Метки (через запятую)</label>
              <input className="input-dark w-full px-3 py-2.5 text-sm"
                value={(form.tags || []).join(", ")}
                placeholder="popular, hit, new, hot, classic"
                onChange={e => set("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => set("is_available", !form.is_available)}
                className={`w-10 h-6 rounded-full transition-all ${form.is_available ? "bg-green-500" : "bg-white/20"}`}>
                <div className={`w-4 h-4 rounded-full bg-white m-1 transition-transform ${form.is_available ? "translate-x-4" : ""}`} />
              </div>
              <span className="text-sm font-body text-ad-cream/70">Доступен</span>
            </label>
          </div>
          {form.image_url && (
            <div className="flex items-center gap-3 p-3 bg-white/3 rounded-2xl">
              <img src={form.image_url} alt="" className="w-16 h-16 object-cover rounded-xl" onError={e => (e.currentTarget.style.display="none")} />
              <span className="text-xs text-ad-cream/40 font-body">Предпросмотр фото</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1 py-3 text-sm">Отмена</button>
            <button onClick={handleSave} disabled={saving || !form.name || !form.price}
              className="btn-primary flex-1 py-3 text-sm disabled:opacity-50">
              {saving ? <Icon name="Loader2" size={16} className="animate-spin inline" /> : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>, document.body
  );
}

// ── PROMO EDITOR MODAL ────────────────────────────────────────────────────────
function PromoEditor({ promo, onSave, onClose }: {
  promo: Partial<Promo> | null;
  onSave: (data: Partial<Promo>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Promo>>(promo || {
    code: "", title: "", description: "", type: "percent",
    value: 0, min_order: 0, is_active: true, emoji: "✨",
    for_new_users: false, for_birthday: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Promo, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return createPortal(
    <div className="fixed inset-0 z-[400] modal-overlay flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-gradient-to-b from-[#0d2010] to-[#071507] rounded-t-3xl sm:rounded-3xl border border-ad-orange/10 max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-ad-cream text-lg">{promo?.id ? "Редактировать акцию" : "Новая акция"}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><Icon name="X" size={16} className="text-ad-cream/60" /></button>
          </div>
          <div className="space-y-3">
            <Field label="Название *" value={form.title || ""} onChange={v => set("title", v)} />
            <Field label="Промокод" value={form.code || ""} placeholder="ПЕРВЫЙ" onChange={v => set("code", v.toUpperCase())} />
            <Field label="Описание" value={form.description || ""} onChange={v => set("description", v)} textarea />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-1 uppercase tracking-wider">Тип</label>
                <select className="input-dark w-full px-3 py-2.5 text-sm" value={form.type}
                  onChange={e => set("type", e.target.value)}>
                  <option value="percent">%</option>
                  <option value="fixed">₽</option>
                </select>
              </div>
              <Field label="Размер" value={form.value || 0} type="number" onChange={v => set("value", parseInt(v) || 0)} />
              <Field label="Эмодзи" value={form.emoji || "✨"} onChange={v => set("emoji", v)} />
            </div>
            <Field label="Мин. сумма (₽)" value={form.min_order || 0} type="number" onChange={v => set("min_order", parseInt(v) || 0)} />
            <div className="flex flex-wrap gap-4">
              {([["is_active","Активна"],["for_new_users","Новым клиентам"],["for_birthday","В день рожд."]] as [keyof Promo, string][]).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-orange-500"
                    checked={!!form[k]} onChange={e => set(k, e.target.checked)} />
                  <span className="text-sm font-body text-ad-cream/70">{lbl}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1 py-3 text-sm">Отмена</button>
            <button onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
              disabled={saving || !form.title}
              className="btn-primary flex-1 py-3 text-sm disabled:opacity-50">
              {saving ? <Icon name="Loader2" size={16} className="animate-spin inline" /> : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>, document.body
  );
}

// ── STORY EDITOR MODAL ────────────────────────────────────────────────────────
function StoryEditor({ story, onSave, onClose }: {
  story: Partial<Story> | null;
  onSave: (data: Partial<Story>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Story>>(story || {
    title: "", emoji: "🍕", bg: "from-orange-600 to-red-700",
    image_url: "", content: "", button_text: "", button_link: "",
    is_active: true, sort_order: 0,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Story, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const BG_PRESETS = [
    "from-orange-600 to-red-700", "from-green-700 to-green-900",
    "from-yellow-600 to-orange-700", "from-pink-600 to-rose-800",
    "from-amber-600 to-yellow-700", "from-blue-700 to-indigo-900",
    "from-purple-700 to-pink-800",
  ];

  return createPortal(
    <div className="fixed inset-0 z-[400] modal-overlay flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-gradient-to-b from-[#0d2010] to-[#071507] rounded-t-3xl sm:rounded-3xl border border-ad-orange/10 max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-ad-cream text-lg">{story?.id ? "Редактировать story" : "Новая story"}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><Icon name="X" size={16} className="text-ad-cream/60" /></button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Field label="Заголовок *" value={form.title || ""} onChange={v => set("title", v)} /></div>
              <Field label="Эмодзи" value={form.emoji || "🍕"} onChange={v => set("emoji", v)} />
            </div>
            <Field label="Текст истории" value={form.content || ""} onChange={v => set("content", v)} textarea />
            <Field label="URL фото/видео" value={form.image_url || ""} placeholder="https://..." onChange={v => set("image_url", v)} />
            <Field label="Текст кнопки" value={form.button_text || ""} placeholder="Заказать" onChange={v => set("button_text", v)} />
            <Field label="Ссылка кнопки" value={form.button_link || ""} placeholder="#menu" onChange={v => set("button_link", v)} />
            <div>
              <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-2 uppercase tracking-wider">Фон</label>
              <div className="flex gap-2 flex-wrap">
                {BG_PRESETS.map(bg => (
                  <button key={bg} onClick={() => set("bg", bg)}
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bg} border-2 transition-all ${form.bg === bg ? "border-white scale-110" : "border-transparent"}`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Сортировка" value={form.sort_order || 0} type="number" onChange={v => set("sort_order", parseInt(v) || 0)} />
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input type="checkbox" className="w-4 h-4 accent-orange-500"
                  checked={!!form.is_active} onChange={e => set("is_active", e.target.checked)} />
                <span className="text-sm font-body text-ad-cream/70">Активна</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1 py-3 text-sm">Отмена</button>
            <button onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
              disabled={saving || !form.title}
              className="btn-primary flex-1 py-3 text-sm disabled:opacity-50">
              {saving ? <Icon name="Loader2" size={16} className="animate-spin inline" /> : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>, document.body
  );
}

// ── MAIN ADMIN ────────────────────────────────────────────────────────────────
interface Props { onClose: () => void }

export default function Admin({ onClose }: Props) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [promoList, setPromoList] = useState<Promo[]>([]);
  const [storyList, setStoryList] = useState<Story[]>([]);
  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Editors
  const [editProduct, setEditProduct] = useState<Partial<Product> | null | undefined>(undefined);
  const [editPromo, setEditPromo] = useState<Partial<Promo> | null | undefined>(undefined);
  const [editStory, setEditStory] = useState<Partial<Story> | null | undefined>(undefined);
  const [savingSettings, setSavingSettings] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadTab = useCallback(async (t: AdminTab) => {
    setLoading(true);
    try {
      if (t === "dashboard") setDashboard(await adminApi.dashboard());
      else if (t === "orders") setOrderList((await adminApi.orders(statusFilter || undefined)).orders);
      else if (t === "products") setProductList((await adminApi.products()).products);
      else if (t === "promos") setPromoList((await adminApi.promos()).promos);
      else if (t === "stories") setStoryList((await adminApi.stories()).stories);
      else if (t === "users") setUserList((await adminApi.users()).users);
      else if (t === "settings") setSiteSettings((await adminApi.getSettings()).settings);
    } catch (e) { showToast((e as Error).message || "Ошибка загрузки"); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  // ── PRODUCTS ──
  const saveProduct = async (data: Partial<Product>) => {
    try {
      if (data.id) await adminApi.updateProduct(data.id, data);
      else await adminApi.createProduct(data);
      showToast("Товар сохранён");
      setEditProduct(undefined);
      loadTab("products");
    } catch (e) { showToast((e as Error).message); }
  };

  const toggleProduct = async (p: Product) => {
    try {
      await adminApi.updateProduct(p.id, { is_available: !p.is_available });
      setProductList(prev => prev.map(x => x.id === p.id ? { ...x, is_available: !x.is_available } : x));
      showToast(p.is_available ? "Товар скрыт" : "Товар активен");
    } catch (e) { showToast((e as Error).message); }
  };

  // ── ORDERS ──
  const changeOrderStatus = async (id: number, status: OrderStatus) => {
    try {
      await adminApi.updateOrderStatus(id, status);
      setOrderList(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      showToast("Статус обновлён");
    } catch (e) { showToast((e as Error).message); }
  };

  // ── PROMOS ──
  const savePromo = async (data: Partial<Promo>) => {
    try {
      if (data.id) await adminApi.updatePromo(data.id, data);
      else await adminApi.createPromo(data);
      showToast("Акция сохранена");
      setEditPromo(undefined);
      loadTab("promos");
    } catch (e) { showToast((e as Error).message); }
  };

  // ── STORIES ──
  const saveStory = async (data: Partial<Story>) => {
    try {
      // rename bg_gradient → bg for backend
      const payload = { ...data, bg_gradient: data.bg };
      if (data.id) await adminApi.updateStory(data.id, payload);
      else await adminApi.createStory(payload);
      showToast("Story сохранена");
      setEditStory(undefined);
      loadTab("stories");
    } catch (e) { showToast((e as Error).message); }
  };

  // ── SETTINGS ──
  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await adminApi.updateSettings(siteSettings);
      showToast("Настройки сохранены");
    } catch (e) { showToast((e as Error).message); }
    setSavingSettings(false);
  };

  if (!user || !["admin","manager","cook","courier","content"].includes(user.role)) {
    return createPortal(
      <div className="fixed inset-0 z-[200] modal-overlay flex items-center justify-center">
        <div className="bg-[#0d2010] rounded-3xl p-8 text-center border border-red-500/20 max-w-sm mx-4">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="font-display font-black text-xl text-ad-cream mb-2">Нет доступа</h2>
          <p className="text-ad-cream/60 font-body text-sm mb-6">Только для сотрудников ARTE DELI</p>
          <button onClick={onClose} className="btn-primary px-6 py-3 text-sm">Закрыть</button>
        </div>
      </div>, document.body
    );
  }

  const tabs: { id: AdminTab; label: string; icon: string; badge?: number }[] = [
    { id: "dashboard", label: "Панель",   icon: "LayoutDashboard" },
    { id: "orders",    label: "Заказы",   icon: "ShoppingBag", badge: dashboard?.stats.new_orders },
    { id: "products",  label: "Меню",     icon: "UtensilsCrossed" },
    { id: "promos",    label: "Акции",    icon: "Tag" },
    { id: "stories",   label: "Stories",  icon: "Play" },
    { id: "settings",  label: "Настройки",icon: "Settings" },
    { id: "users",     label: "Клиенты",  icon: "Users" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-[#03270D] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="header-blur border-b border-ad-orange/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ad-orange to-ad-gold flex items-center justify-center">
            <span className="text-sm">🍕</span>
          </div>
          <span className="font-display font-black text-ad-cream">ARTE DELI</span>
          <span className="text-ad-orange/60 text-xs font-body hidden sm:block">Админ-панель</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ad-cream/40 font-body hidden sm:block">{user.name || user.phone}</span>
          <button onClick={async () => { await logout(); onClose(); }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-ad-cream/50 hover:text-red-400 transition-colors">
            <Icon name="LogOut" size={15} />
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
            <Icon name="X" size={16} className="text-ad-cream/60" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-14 sm:w-44 border-r border-white/5 flex-shrink-0 overflow-y-auto bg-black/10">
          <div className="py-3 space-y-0.5 px-1.5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl transition-all relative group ${
                  tab === t.id ? "bg-ad-orange text-white" : "text-ad-cream/60 hover:bg-white/5 hover:text-ad-cream"
                }`}>
                <Icon name={t.icon} size={17} />
                <span className="font-display font-semibold text-xs hidden sm:block">{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="absolute top-1 right-1 sm:relative sm:top-0 sm:right-0 sm:ml-auto w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Icon name="Loader2" size={32} className="animate-spin text-ad-orange" />
            </div>
          ) : (

          <>
          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && dashboard && (
            <div className="space-y-5">
              <h2 className="font-display font-black text-xl text-ad-cream">Панель управления</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: "Новых заказов",   value: dashboard.stats.new_orders,   icon: "Bell",     color: "text-yellow-400" },
                  { label: "Заказов сегодня", value: dashboard.stats.today_orders, icon: "ShoppingBag", color: "text-blue-400" },
                  { label: "Выручка сегодня", value: `${dashboard.stats.today_revenue?.toLocaleString("ru-RU") ?? 0} ₽`, icon: "TrendingUp", color: "text-green-400" },
                  { label: "Общая выручка",   value: `${dashboard.stats.revenue?.toLocaleString("ru-RU") ?? 0} ₽`, icon: "Wallet", color: "text-ad-orange" },
                  { label: "Всего заказов",   value: dashboard.stats.total_orders, icon: "Package",  color: "text-purple-400" },
                  { label: "Клиентов",         value: dashboard.stats.total_clients, icon: "Users",  color: "text-pink-400" },
                ].map(s => (
                  <div key={s.label} className="bg-dark-card rounded-2xl p-4 border border-white/5">
                    <Icon name={s.icon} size={18} className={s.color} />
                    <div className={`font-display font-black text-xl mt-2 ${s.color}`}>{s.value}</div>
                    <div className="text-ad-cream/45 text-xs font-body mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-display font-bold text-ad-cream mb-3">Последние заказы</h3>
                <div className="space-y-2">
                  {dashboard.recent_orders.map(o => (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-white/3 rounded-2xl border border-white/5">
                      <div>
                        <span className="font-display font-semibold text-ad-cream text-sm">№{o.id} — {o.name}</span>
                        <div className="text-xs text-ad-cream/40 font-body">{o.phone} · {o.delivery_type === "pickup" ? "Самовывоз" : "Доставка"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-ad-orange text-sm">{o.total} ₽</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${sColor(o.status)}`}>{sLabel(o.status)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-display font-black text-xl text-ad-cream">Заказы</h2>
                <button onClick={() => loadTab("orders")} className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1">
                  <Icon name="RefreshCw" size={12} /> Обновить
                </button>
              </div>
              {/* Status filter */}
              <div className="flex gap-1.5 flex-wrap">
                {["", ...STATUS_OPTIONS.map(s => s.v)].map(s => (
                  <button key={s}
                    onClick={() => { setStatusFilter(s); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-display font-bold border transition-all ${
                      statusFilter === s
                        ? "bg-ad-orange border-ad-orange text-white"
                        : "bg-white/3 border-white/10 text-ad-cream/60 hover:border-ad-orange/30"
                    }`}>{s ? sLabel(s) : "Все"}</button>
                ))}
              </div>
              {orderList.length === 0
                ? <div className="text-center py-16 text-ad-cream/40 font-body">Заказов нет</div>
                : orderList
                    .filter(o => !statusFilter || o.status === statusFilter)
                    .map(o => (
                  <div key={o.id} className="bg-dark-card rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="font-display font-bold text-ad-cream">№{o.id} — {o.customer_name}</div>
                          <div className="text-ad-cream/50 text-sm font-body">{o.customer_phone}</div>
                          {o.address && <div className="text-ad-cream/40 text-xs font-body mt-0.5">📍 {o.address}{o.apartment ? `, кв. ${o.apartment}` : ""}</div>}
                          <div className="text-ad-cream/30 text-xs font-body mt-0.5">{new Date(o.created_at).toLocaleString("ru-RU")}</div>
                          {o.payment_method && <div className="text-ad-cream/40 text-xs font-body">💳 {o.payment_method === "cash" ? "Наличные" : o.payment_method === "transfer" ? "Перевод" : "Терминал"}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-display font-black text-ad-orange text-lg">{o.total} ₽</div>
                          <span className={`text-xs px-2 py-1 rounded-full border ${sColor(o.status)}`}>{sLabel(o.status)}</span>
                        </div>
                      </div>
                      {o.items && o.items.length > 0 && (
                        <div className="mb-3 space-y-0.5 bg-white/3 rounded-xl p-2">
                          {o.items.map((item, i) => (
                            <div key={i} className="text-xs text-ad-cream/60 font-body flex justify-between">
                              <span>{item.emoji} {item.name} × {item.quantity}</span>
                              <span>{item.total} ₽</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {o.comment && <div className="text-xs text-ad-cream/50 font-body italic mb-3">💬 {o.comment}</div>}
                      <div className="flex gap-1.5 flex-wrap">
                        {STATUS_OPTIONS.filter(s => s.v !== o.status).map(s => (
                          <button key={s.v}
                            onClick={() => changeOrderStatus(o.id, s.v)}
                            className="px-3 py-1.5 rounded-full text-xs font-display font-bold bg-white/5 border border-white/10 hover:border-ad-orange/40 text-ad-cream/70 hover:text-ad-cream transition-all">
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {tab === "products" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-xl text-ad-cream">Меню ({productList.length})</h2>
                <button onClick={() => setEditProduct({})} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                  <Icon name="Plus" size={14} /> Добавить
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {productList.map(p => (
                  <div key={p.id} className={`bg-dark-card rounded-2xl border p-3 ${p.is_available ? "border-white/5" : "border-red-500/20 opacity-60"}`}>
                    <div className="flex items-center gap-3">
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        : <div className="text-3xl w-12 h-12 flex items-center justify-center flex-shrink-0">{p.emoji}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-ad-cream text-sm truncate">{p.name}</div>
                        <div className="font-display font-bold text-ad-orange text-sm">{p.price} ₽</div>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {p.tags.map(t => <span key={t} className="tag-popular text-[10px] py-0">{t}</span>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setEditProduct(p)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
                          <Icon name="Pencil" size={13} className="text-ad-cream/60" />
                        </button>
                        <button onClick={() => toggleProduct(p)}
                          className={`w-10 h-6 rounded-full transition-all ${p.is_available ? "bg-green-500" : "bg-white/20"}`}>
                          <div className={`w-4 h-4 rounded-full bg-white mx-auto transition-transform ${p.is_available ? "translate-x-2" : "-translate-x-2"}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PROMOS ── */}
          {tab === "promos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-xl text-ad-cream">Акции и промокоды</h2>
                <button onClick={() => setEditPromo({})} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                  <Icon name="Plus" size={14} /> Добавить
                </button>
              </div>
              <div className="space-y-3">
                {promoList.map(p => (
                  <div key={p.id} className={`bg-dark-card rounded-2xl border p-4 ${p.is_active ? "border-white/5" : "border-red-500/20 opacity-60"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{p.emoji}</span>
                          <span className="font-display font-bold text-ad-cream">{p.title}</span>
                        </div>
                        <p className="text-ad-cream/50 text-sm font-body">{p.description}</p>
                        {p.code && (
                          <div className="mt-2 inline-flex items-center gap-1 bg-ad-orange/10 border border-ad-orange/25 rounded-xl px-2.5 py-1">
                            <Icon name="Tag" size={12} className="text-ad-orange" />
                            <span className="font-display font-bold text-ad-orange text-sm">{p.code}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="font-display font-black text-ad-orange text-lg">
                          {p.type === "percent" ? `${p.value}%` : `${p.value} ₽`}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {p.is_active ? "Активна" : "Выкл."}
                        </span>
                        <div className="mt-2">
                          <button onClick={() => setEditPromo(p)} className="text-xs text-ad-cream/50 hover:text-ad-orange flex items-center gap-1 ml-auto">
                            <Icon name="Pencil" size={12} /> Изменить
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STORIES ── */}
          {tab === "stories" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-xl text-ad-cream">Stories ({storyList.length})</h2>
                <button onClick={() => setEditStory({})} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                  <Icon name="Plus" size={14} /> Добавить
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {storyList.map(s => (
                  <div key={s.id} className={`bg-dark-card rounded-2xl border p-4 ${s.is_active ? "border-white/5" : "border-white/5 opacity-50"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
                        {s.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-ad-cream text-sm truncate">{s.title}</div>
                        {s.content && <div className="text-ad-cream/50 text-xs font-body truncate">{s.content}</div>}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs ${s.is_active ? "text-green-400" : "text-red-400"}`}>
                            {s.is_active ? "● Активна" : "○ Скрыта"}
                          </span>
                          <span className="text-ad-cream/30 text-xs font-body">👁 {s.views}</span>
                        </div>
                      </div>
                      <button onClick={() => setEditStory(s)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Icon name="Pencil" size={13} className="text-ad-cream/60" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === "settings" && (
            <div className="space-y-5 max-w-xl">
              <h2 className="font-display font-black text-xl text-ad-cream">Настройки сайта</h2>

              {[
                { section: "Hero-блок главной", fields: [
                  { key: "hero_title", label: "Заголовок" },
                  { key: "hero_subtitle", label: "Подзаголовок" },
                  { key: "hero_image_url", label: "URL фото (hero)" },
                  { key: "hero_btn1", label: "Кнопка 1" },
                  { key: "hero_btn2", label: "Кнопка 2" },
                ]},
                { section: "Контакты", fields: [
                  { key: "phone", label: "Телефон" },
                  { key: "address", label: "Адрес" },
                  { key: "email", label: "Email" },
                  { key: "vk_url", label: "ВКонтакте" },
                ]},
                { section: "График работы", fields: [
                  { key: "work_hours_open", label: "Открытие" },
                  { key: "work_hours_close", label: "Закрытие" },
                ]},
                { section: "Доставка", fields: [
                  { key: "delivery_free_from", label: "Бесплатно от (₽)" },
                  { key: "delivery_cost", label: "Стоимость доставки (₽)" },
                ]},
              ].map(section => (
                <div key={section.section} className="bg-dark-card rounded-2xl border border-white/5 p-5 space-y-3">
                  <h3 className="font-display font-bold text-ad-cream text-sm">{section.section}</h3>
                  {section.fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-1 uppercase tracking-wider">{f.label}</label>
                      <input
                        className="input-dark w-full px-3 py-2.5 text-sm"
                        value={siteSettings[f.key] || ""}
                        onChange={e => setSiteSettings(prev => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              ))}

              {/* Preview hero image */}
              {siteSettings.hero_image_url && (
                <div className="bg-dark-card rounded-2xl border border-white/5 p-4">
                  <div className="text-xs font-display font-semibold text-ad-cream/50 mb-2 uppercase tracking-wider">Предпросмотр hero</div>
                  <img src={siteSettings.hero_image_url} alt="hero preview"
                    className="w-full max-h-48 object-cover rounded-xl"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}

              <button onClick={saveSettings} disabled={savingSettings}
                className="btn-primary w-full py-4 text-base disabled:opacity-50">
                {savingSettings ? <span className="flex items-center justify-center gap-2"><Icon name="Loader2" size={16} className="animate-spin" /> Сохраняем...</span> : "Сохранить настройки"}
              </button>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-xl text-ad-cream">Клиенты</h2>
                <span className="text-ad-cream/40 text-sm font-body">{userList.length} чел.</span>
              </div>
              {userList.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white/3 rounded-2xl border border-white/5">
                  <div>
                    <div className="font-display font-semibold text-ad-cream text-sm">
                      {u.name || "—"} <span className="text-ad-cream/30 font-normal">{u.phone}</span>
                    </div>
                    {u.email && <div className="text-xs text-ad-cream/40 font-body">{u.email}</div>}
                    {u.birth_date && <div className="text-xs text-ad-gold font-body">🎂 {u.birth_date}</div>}
                    <div className="text-xs text-ad-cream/25 font-body">{new Date(u.created_at).toLocaleDateString("ru-RU")}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    u.role === "admin" ? "bg-ad-orange/20 text-ad-orange border-ad-orange/30" :
                    "bg-white/5 text-ad-cream/50 border-white/10"
                  }`}>{u.role}</span>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* Modals */}
      {editProduct !== undefined && (
        <ProductEditor product={editProduct} onSave={saveProduct} onClose={() => setEditProduct(undefined)} />
      )}
      {editPromo !== undefined && (
        <PromoEditor promo={editPromo} onSave={savePromo} onClose={() => setEditPromo(undefined)} />
      )}
      {editStory !== undefined && (
        <StoryEditor story={editStory} onSave={saveStory} onClose={() => setEditStory(undefined)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] toast-ad px-5 py-3 text-sm font-display font-semibold text-ad-cream animate-fade-in-up">
          {toast}
        </div>
      )}
    </div>,
    document.body
  );
}
