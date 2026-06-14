import { useState, useEffect } from "react";
import { orders as ordersApi, auth as authApi, Order } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Icon from "@/components/ui/icon";

const STATUS_COLOR: Record<string, string> = {
  processing: "status-soon", accepted: "status-open", delivering: "status-open",
  delivered: "status-open", cancelled: "status-closed",
};
const STATUS_EMOJI: Record<string, string> = {
  processing: "⏳", accepted: "👨‍🍳", delivering: "🛵", delivered: "✅", cancelled: "❌",
};

interface Props {
  onClose: () => void;
  onOrderAgain: (items: { id: number; name: string; emoji: string; price: number; qty: number }[]) => void;
}

export default function Cabinet({ onClose, onOrderAgain }: Props) {
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<"orders" | "profile" | "addresses">("orders");
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "", birth_date: user?.birth_date || "" });
  const [profileSaved, setProfileSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ordersApi.list();
        setOrderList(res.orders);
      } catch { /* ignore */ }
      setOrdersLoading(false);
    };
    load();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile(profile);
      await refreshUser();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const tabs = [
    { id: "orders", label: "Заказы", icon: "ShoppingBag" },
    { id: "profile", label: "Профиль", icon: "User" },
    { id: "addresses", label: "Адреса", icon: "MapPin" },
  ] as const;

  return (
    <div className="fixed inset-0 z-[200] flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-full max-w-md bg-gradient-to-b from-[#0d2010] to-[#071507] h-full overflow-y-auto border-l border-ad-orange/10 animate-slide-in-right shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-ad-orange/20 flex items-center justify-center">
                <Icon name="User" size={22} className="text-ad-orange" />
              </div>
              <div>
                <div className="font-display font-bold text-ad-cream text-base">
                  {user?.name || "Гость"}
                </div>
                <div className="text-ad-cream/50 text-sm font-body">{user?.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === "admin" && (
                <span className="tag-hot">Admin</span>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <Icon name="X" size={16} className="text-ad-cream/50" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/3 rounded-2xl p-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-display font-bold transition-all ${
                  tab === t.id ? "bg-ad-orange text-white shadow-md" : "text-ad-cream/60 hover:text-ad-cream"
                }`}>
                <Icon name={t.icon} size={13} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* ORDERS */}
          {tab === "orders" && (
            ordersLoading ? (
              <div className="flex items-center justify-center py-16">
                <Icon name="Loader2" size={28} className="animate-spin text-ad-orange" />
              </div>
            ) : orderList.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-5xl">🍕</div>
                <div className="font-display font-bold text-ad-cream/60 text-lg">Заказов пока нет</div>
                <p className="text-ad-cream/40 text-sm font-body">Оформите первый заказ!</p>
                <button onClick={onClose} className="btn-primary px-6 py-3 text-sm mt-3">Выбрать пиццу</button>
              </div>
            ) : (
              <div className="space-y-4">
                {orderList.map(order => (
                  <div key={order.id} className="bg-white/3 rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-display font-bold text-ad-cream text-sm">Заказ №{order.id}</div>
                          <div className="text-ad-cream/40 text-xs font-body mt-0.5">
                            {new Date(order.created_at).toLocaleDateString("ru-RU", { day:"numeric", month:"long", hour:"2-digit", minute:"2-digit" })}
                          </div>
                        </div>
                        <span className={`${STATUS_COLOR[order.status] || "status-soon"} flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-display font-bold`}>
                          {STATUS_EMOJI[order.status]} {order.status_label}
                        </span>
                      </div>
                      <div className="space-y-1 mb-3">
                        {order.items.slice(0, 3).map((item, i) => (
                          <div key={i} className="text-xs text-ad-cream/60 font-body">
                            {item.emoji} {item.name} × {item.quantity}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-xs text-ad-cream/40 font-body">+ ещё {order.items.length - 3}</div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-display font-black text-ad-orange">{order.total} ₽</span>
                        {order.status === "delivered" && (
                          <button
                            onClick={() => {
                              const items = order.items.map(i => ({ id: i.product_id, name: i.name, emoji: i.emoji, price: i.price, qty: i.quantity }));
                              onOrderAgain(items);
                              onClose();
                            }}
                            className="flex items-center gap-1.5 text-xs btn-outline px-3 py-1.5"
                          >
                            <Icon name="RotateCcw" size={12} /> Повторить
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-1.5 uppercase tracking-wider">Имя</label>
                <input className="input-dark w-full px-4 py-3 text-sm" placeholder="Ваше имя"
                  value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-1.5 uppercase tracking-wider">Email</label>
                <input className="input-dark w-full px-4 py-3 text-sm" placeholder="email@example.com" type="email"
                  value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-1.5 uppercase tracking-wider">
                  Дата рождения
                </label>
                <input className="input-dark w-full px-4 py-3 text-sm" type="date"
                  value={profile.birth_date} onChange={e => setProfile({...profile, birth_date: e.target.value})} />
                <p className="text-xs text-ad-orange/60 font-body mt-1">Скидка 15% в день рождения (промокод ХЭППИ)</p>
              </div>
              <div className="bg-white/3 rounded-2xl p-4 border border-white/5">
                <div className="text-xs text-ad-cream/40 font-body mb-1">Телефон</div>
                <div className="font-display font-semibold text-ad-cream">{user?.phone}</div>
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="btn-primary w-full py-3.5 text-sm font-bold disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="Loader2" size={14} className="animate-spin" /> Сохраняем...
                  </span>
                ) : profileSaved ? "✓ Сохранено!" : "Сохранить"}
              </button>

              <div className="section-divider" />
              <button
                onClick={async () => { await logout(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-red-400 hover:text-red-300 font-display font-semibold transition-colors"
              >
                <Icon name="LogOut" size={14} /> Выйти из аккаунта
              </button>
            </div>
          )}

          {/* ADDRESSES */}
          {tab === "addresses" && (
            <div className="space-y-3">
              {(user?.addresses || []).length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">📍</div>
                  <div className="text-ad-cream/50 font-body text-sm">Адреса доставки пока не добавлены</div>
                  <p className="text-xs text-ad-cream/30 font-body">Адрес сохранится автоматически при следующем заказе</p>
                </div>
              ) : (
                (user?.addresses || []).map((addr) => (
                  <div key={addr.id} className="p-4 bg-white/3 rounded-2xl border border-white/5">
                    <div className="flex items-start gap-3">
                      <Icon name="MapPin" size={16} className="text-ad-orange flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-body text-sm text-ad-cream">{addr.address}</div>
                        {addr.apartment && <div className="text-xs text-ad-cream/40 mt-0.5">Кв. {addr.apartment}</div>}
                        {addr.is_default && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-1">
                            <Icon name="Check" size={10} /> Основной
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
