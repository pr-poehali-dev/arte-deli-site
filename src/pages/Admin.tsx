import { useState, useEffect, useCallback } from "react";
import { admin as adminApi, products as productsApi, DashboardData, Order, Product, Promo, PartnerRequest, AdminUser } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Icon from "@/components/ui/icon";

const STATUS_OPTIONS = [
  { v: "processing", label: "⏳ Принят" },
  { v: "accepted",   label: "👨‍🍳 Готовится" },
  { v: "delivering", label: "🛵 Везём" },
  { v: "delivered",  label: "✅ Доставлен" },
  { v: "cancelled",  label: "❌ Отменён" },
] as const;

const STATUS_COLOR: Record<string, string> = {
  processing: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  accepted:   "bg-blue-500/20 text-blue-300 border-blue-500/30",
  delivering: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  delivered:  "bg-green-500/20 text-green-300 border-green-500/30",
  cancelled:  "bg-red-500/20 text-red-300 border-red-500/30",
};

type AdminTab = "dashboard" | "orders" | "products" | "promos" | "partners" | "users";

interface Props { onClose: () => void }

export default function Admin({ onClose }: Props) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [promoList, setPromoList] = useState<Promo[]>([]);
  const [partnerList, setPartnerList] = useState<PartnerRequest[]>([]);
  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadTab = useCallback(async (t: AdminTab) => {
    setLoading(true);
    try {
      if (t === "dashboard") {
        const r = await adminApi.dashboard();
        setDashboard(r);
      } else if (t === "orders") {
        const r = await adminApi.orders(statusFilter || undefined);
        setOrderList(r.orders);
      } else if (t === "products") {
        const r = await adminApi.products();
        setProductList(r.products);
      } else if (t === "promos") {
        const r = await adminApi.promos();
        setPromoList(r.promos);
      } else if (t === "partners") {
        const r = await adminApi.partners();
        setPartnerList(r.partners);
      } else if (t === "users") {
        const r = await adminApi.users();
        setUserList(r.users);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  const changeOrderStatus = async (id: number, status: string) => {
    try {
      await adminApi.updateOrderStatus(id, status as Order["status"]);
      setOrderList(prev => prev.map(o => o.id === id ? { ...o, status: status as Order["status"], status_label: STATUS_OPTIONS.find(s => s.v === status)?.label || status } : o));
      showToast("Статус обновлён");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Ошибка"); }
  };

  const toggleProduct = async (p: Product) => {
    try {
      await adminApi.updateProduct(p.id, { is_available: !p.is_available });
      setProductList(prev => prev.map(x => x.id === p.id ? { ...x, is_available: !x.is_available } : x));
      showToast(p.is_available ? "Товар скрыт" : "Товар активен");
    } catch { /* ignore */ }
  };

  const updatePartnerStatus = async (id: number, status: string) => {
    try {
      await adminApi.updatePartnerStatus(id, status);
      setPartnerList(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      showToast("Статус обновлён");
    } catch { /* ignore */ }
  };

  const tabs: { id: AdminTab; label: string; icon: string; badge?: number }[] = [
    { id: "dashboard", label: "Панель", icon: "LayoutDashboard" },
    { id: "orders", label: "Заказы", icon: "ShoppingBag", badge: dashboard?.stats.new_orders },
    { id: "products", label: "Меню", icon: "Pizza" },
    { id: "promos", label: "Акции", icon: "Tag" },
    { id: "partners", label: "Партнёры", icon: "Handshake", badge: dashboard?.stats.new_partners },
    { id: "users", label: "Клиенты", icon: "Users" },
  ];

  if (!user || !["admin","manager","cook","courier","content"].includes(user.role)) {
    return (
      <div className="fixed inset-0 z-[200] modal-overlay flex items-center justify-center">
        <div className="bg-[#0d2010] rounded-3xl p-8 text-center border border-red-500/20 max-w-sm mx-4">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="font-display font-black text-xl text-ad-cream mb-2">Нет доступа</h2>
          <p className="text-ad-cream/60 font-body text-sm mb-6">Эта страница только для сотрудников ARTE DELI</p>
          <button onClick={onClose} className="btn-primary px-6 py-3 text-sm">Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#03270D] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="header-blur border-b border-ad-orange/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ad-orange to-ad-gold flex items-center justify-center">
            <span className="text-sm">🍕</span>
          </div>
          <div>
            <span className="font-display font-black text-ad-cream">ARTE DELI</span>
            <span className="text-ad-orange/70 text-xs font-body ml-2">Админ</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ad-cream/40 font-body hidden sm:block">{user.name || user.phone}</span>
          <button onClick={async () => { await logout(); onClose(); }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-ad-cream/50 hover:text-red-400 transition-colors">
            <Icon name="LogOut" size={15} />
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
            <Icon name="X" size={16} className="text-ad-cream/60" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-16 sm:w-48 border-r border-white/5 flex-shrink-0 overflow-y-auto bg-black/10">
          <div className="py-4 space-y-1 px-2">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all relative ${
                  tab === t.id
                    ? "bg-ad-orange text-white"
                    : "text-ad-cream/60 hover:bg-white/5 hover:text-ad-cream"
                }`}>
                <Icon name={t.icon} size={18} />
                <span className="font-display font-semibold text-sm hidden sm:block">{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="absolute top-1 right-1 sm:relative sm:top-0 sm:right-0 sm:ml-auto w-5 h-5 bg-red-500 rounded-full text-xs font-bold text-white flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Icon name="Loader2" size={32} className="animate-spin text-ad-orange" />
            </div>
          ) : (
            <>
              {/* DASHBOARD */}
              {tab === "dashboard" && dashboard && (
                <div className="space-y-6">
                  <h2 className="font-display font-black text-2xl text-ad-cream">Панель управления</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Новые заказы", value: dashboard.stats.new_orders, icon: "ShoppingBag", color: "text-yellow-400" },
                      { label: "Выручка", value: `${dashboard.stats.revenue.toLocaleString("ru-RU")} ₽`, icon: "TrendingUp", color: "text-green-400" },
                      { label: "Клиенты", value: dashboard.stats.total_clients, icon: "Users", color: "text-blue-400" },
                      { label: "Заявки партнёров", value: dashboard.stats.new_partners, icon: "Handshake", color: "text-ad-orange" },
                    ].map(s => (
                      <div key={s.label} className="bg-dark-card rounded-2xl p-5 border border-white/5">
                        <Icon name={s.icon} size={20} className={s.color} />
                        <div className={`font-display font-black text-2xl mt-2 ${s.color}`}>{s.value}</div>
                        <div className="text-ad-cream/50 text-xs font-body mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-ad-cream text-lg mb-4">Последние заказы</h3>
                    <div className="space-y-2">
                      {dashboard.recent_orders.map(o => (
                        <div key={o.id} className="flex items-center justify-between p-4 bg-white/3 rounded-2xl border border-white/5">
                          <div>
                            <span className="font-display font-semibold text-ad-cream text-sm">№{o.id} — {o.name}</span>
                            <div className="text-xs text-ad-cream/40 font-body">{o.phone}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-display font-bold text-ad-orange text-sm">{o.total} ₽</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[o.status] || ""}`}>{o.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ORDERS */}
              {tab === "orders" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h2 className="font-display font-black text-2xl text-ad-cream">Заказы</h2>
                    <div className="flex gap-2 flex-wrap">
                      {["", "processing", "accepted", "delivering", "delivered", "cancelled"].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); loadTab("orders"); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-display font-bold border transition-all ${
                            statusFilter === s
                              ? "bg-ad-orange border-ad-orange text-white"
                              : "bg-white/3 border-white/10 text-ad-cream/60 hover:border-ad-orange/30"
                          }`}>
                          {s || "Все"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {orderList.length === 0 ? (
                      <div className="text-center py-12 text-ad-cream/40 font-body">Заказов нет</div>
                    ) : orderList.map(o => (
                      <div key={o.id} className="bg-dark-card rounded-2xl border border-white/5 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-display font-bold text-ad-cream">№{o.id} — {o.customer_name}</div>
                              <div className="text-ad-cream/50 text-sm font-body">{o.customer_phone}</div>
                              {o.address && <div className="text-ad-cream/40 text-xs font-body mt-0.5">📍 {o.address}</div>}
                              <div className="text-ad-cream/30 text-xs font-body mt-0.5">
                                {new Date(o.created_at).toLocaleString("ru-RU")}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-display font-black text-ad-orange text-lg">{o.total} ₽</div>
                              <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLOR[o.status] || ""}`}>
                                {STATUS_OPTIONS.find(s => s.v === o.status)?.label || o.status}
                              </span>
                            </div>
                          </div>
                          <div className="mb-3 space-y-0.5">
                            {o.items?.map((item, i) => (
                              <div key={i} className="text-xs text-ad-cream/50 font-body">
                                {item.emoji} {item.name} × {item.quantity} — {item.total} ₽
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 flex-wrap">
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
                    ))}
                  </div>
                </div>
              )}

              {/* PRODUCTS */}
              {tab === "products" && (
                <div className="space-y-4">
                  <h2 className="font-display font-black text-2xl text-ad-cream">Меню</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {productList.map(p => (
                      <div key={p.id} className={`bg-dark-card rounded-2xl border p-4 transition-all ${
                        p.is_available ? "border-white/5" : "border-red-500/20 opacity-60"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{p.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-bold text-ad-cream text-sm">{p.name}</div>
                            <div className="text-ad-orange font-bold text-sm">{p.price} ₽</div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {p.tags.map(t => <span key={t} className="tag-popular text-[10px]">{t}</span>)}
                            </div>
                          </div>
                          <button onClick={() => toggleProduct(p)}
                            className={`w-10 h-6 rounded-full transition-all flex-shrink-0 ${
                              p.is_available ? "bg-green-500" : "bg-white/20"
                            }`}>
                            <div className={`w-4 h-4 rounded-full bg-white mx-auto transition-transform ${
                              p.is_available ? "translate-x-2" : "-translate-x-2"
                            }`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PROMOS */}
              {tab === "promos" && (
                <div className="space-y-4">
                  <h2 className="font-display font-black text-2xl text-ad-cream">Акции и промокоды</h2>
                  <div className="space-y-3">
                    {promoList.map(p => (
                      <div key={p.id} className={`bg-dark-card rounded-2xl border p-4 ${p.is_active ? "border-white/5" : "border-red-500/20 opacity-60"}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{p.emoji}</span>
                              <span className="font-display font-bold text-ad-cream">{p.title}</span>
                            </div>
                            <div className="text-ad-cream/50 text-sm font-body mt-1">{p.description}</div>
                            {p.code && (
                              <div className="mt-2 inline-flex items-center gap-2 bg-ad-orange/10 border border-ad-orange/25 rounded-xl px-3 py-1.5">
                                <span className="font-display font-bold text-ad-orange text-sm">{p.code}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <div className="font-display font-black text-ad-orange text-lg">
                              {p.type === "percent" ? `${p.value}%` : `${p.value} ₽`}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                              {p.is_active ? "Активна" : "Отключена"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {promoList.length === 0 && (
                      <div className="text-center py-12 text-ad-cream/40 font-body">Акций нет. Используйте seed для заполнения.</div>
                    )}
                  </div>
                </div>
              )}

              {/* PARTNERS */}
              {tab === "partners" && (
                <div className="space-y-4">
                  <h2 className="font-display font-black text-2xl text-ad-cream">Заявки партнёров</h2>
                  <div className="space-y-3">
                    {partnerList.length === 0 ? (
                      <div className="text-center py-12 text-ad-cream/40 font-body">Заявок нет</div>
                    ) : partnerList.map(p => (
                      <div key={p.id} className="bg-dark-card rounded-2xl border border-white/5 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-display font-bold text-ad-cream">{p.place_name}</div>
                            <div className="text-ad-cream/60 text-sm font-body mt-1">{p.phone}</div>
                            {p.email && <div className="text-ad-cream/40 text-xs font-body">{p.email}</div>}
                            {p.comment && <div className="text-ad-cream/50 text-sm font-body mt-2 italic">"{p.comment}"</div>}
                            <div className="text-ad-cream/30 text-xs font-body mt-2">
                              {new Date(p.created_at).toLocaleDateString("ru-RU")}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full text-center ${
                              p.status === "new" ? "bg-yellow-500/20 text-yellow-300" :
                              p.status === "approved" ? "bg-green-500/20 text-green-300" :
                              p.status === "contacted" ? "bg-blue-500/20 text-blue-300" :
                              "bg-red-500/20 text-red-300"
                            }`}>{p.status}</span>
                            <div className="flex gap-1">
                              {["contacted","approved","rejected"].filter(s => s !== p.status).map(s => (
                                <button key={s} onClick={() => updatePartnerStatus(p.id, s)}
                                  className="px-2 py-1 text-xs bg-white/5 rounded-lg border border-white/10 text-ad-cream/60 hover:text-ad-cream hover:border-ad-orange/30 transition-all">
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* USERS */}
              {tab === "users" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-black text-2xl text-ad-cream">Клиенты</h2>
                    <span className="text-ad-cream/40 text-sm font-body">{userList.length} чел.</span>
                  </div>
                  <div className="space-y-2">
                    {userList.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-white/3 rounded-2xl border border-white/5">
                        <div>
                          <div className="font-display font-semibold text-ad-cream text-sm">
                            {u.name || "—"} <span className="text-ad-cream/30">{u.phone}</span>
                          </div>
                          {u.email && <div className="text-xs text-ad-cream/40 font-body">{u.email}</div>}
                          <div className="text-xs text-ad-cream/30 font-body mt-0.5">
                            {new Date(u.created_at).toLocaleDateString("ru-RU")}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          u.role === "admin" ? "bg-ad-orange/20 text-ad-orange border-ad-orange/30" :
                          "bg-white/5 text-ad-cream/50 border-white/10"
                        }`}>{u.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Seed button (admin only) */}
      {user.role === "admin" && tab === "products" && productList.length === 0 && (
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={async () => {
              try {
                await productsApi.partner({ place_name: "_seed", phone: "_" });
                showToast("Данные заполнены!");
                loadTab("products");
              } catch { /* ignore */ }
            }}
            className="btn-outline w-full py-3 text-sm"
          >
            ⚙️ Заполнить меню тестовыми данными
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] toast-ad px-5 py-3 text-sm font-display font-semibold text-ad-cream animate-fade-in-up">
          {toast}
        </div>
      )}
    </div>
  );
}
