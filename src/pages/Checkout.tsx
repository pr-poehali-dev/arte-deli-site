import { useState, useEffect } from "react";
import { orders as ordersApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Icon from "@/components/ui/icon";

interface CartItem {
  id: number; name: string; emoji: string; price: number; qty: number;
}

interface Props {
  cart: CartItem[];
  onSuccess: (orderId: number) => void;
  onBack: () => void;
}

const STATUS_STEPS = [
  { key: "processing", label: "Принят", emoji: "📋", desc: "Заказ в обработке" },
  { key: "accepted",   label: "Готовится", emoji: "👨‍🍳", desc: "Пицца на кухне" },
  { key: "delivering", label: "В пути", emoji: "🛵", desc: "Курьер едет к вам" },
  { key: "delivered",  label: "Доставлен", emoji: "✅", desc: "Приятного аппетита!" },
];

export function OrderTracker({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const [order, setOrder] = useState<{ status: string; status_label: string; customer_name: string; total: number; items: { name: string; emoji: string; quantity: number; total: number }[]; delivery_type: string; address: string | null; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ordersApi.get(orderId);
        setOrder(res.order as typeof order);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const stepIdx = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : 0;

  return (
    <div className="fixed inset-0 z-[200] modal-overlay flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#0a1f0a] to-[#071507] rounded-t-3xl sm:rounded-3xl border border-ad-orange/15 overflow-hidden animate-fade-in-up">
        {/* Success header */}
        <div className="bg-gradient-to-r from-ad-orange/20 to-ad-gold/10 p-6 border-b border-ad-orange/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl mb-2">🎉</div>
              <h2 className="font-display font-black text-2xl text-ad-cream">Заказ принят!</h2>
              <p className="text-ad-cream/60 text-sm font-body mt-1">
                Уже передали на кухню · Заказ №{orderId}
              </p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
              <Icon name="X" size={18} className="text-ad-cream/50" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="Loader2" size={28} className="animate-spin text-ad-orange" />
            </div>
          ) : (
            <>
              {/* Tracker */}
              <div>
                <div className="text-xs font-display font-bold text-ad-gold uppercase tracking-widest mb-4">
                  Статус заказа
                </div>
                <div className="relative">
                  {/* Progress line */}
                  <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-white/5" />
                  <div
                    className="absolute left-5 top-5 w-0.5 bg-gradient-to-b from-ad-orange to-ad-gold transition-all duration-700"
                    style={{ height: `${Math.max(0, stepIdx) * 33.3}%` }}
                  />
                  <div className="space-y-4">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= stepIdx;
                      const active = i === stepIdx;
                      return (
                        <div key={step.key} className="flex items-center gap-4 relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-300 ${
                            active ? "bg-ad-orange glow-orange-sm scale-110" :
                            done ? "bg-ad-orange/30 border border-ad-orange/50" :
                            "bg-white/5 border border-white/10"
                          }`}>
                            <span className="text-base">{step.emoji}</span>
                          </div>
                          <div className={done ? "" : "opacity-40"}>
                            <div className={`font-display font-bold text-sm ${active ? "text-ad-orange" : "text-ad-cream"}`}>
                              {step.label}
                            </div>
                            <div className="text-ad-cream/50 text-xs font-body">{step.desc}</div>
                          </div>
                          {active && (
                            <div className="ml-auto">
                              <span className="text-xs text-ad-orange font-display font-bold animate-pulse">● Сейчас</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Order summary */}
              {order && (
                <>
                  <div className="section-divider" />
                  <div>
                    <div className="text-xs font-display font-bold text-ad-gold uppercase tracking-widest mb-3">
                      Состав заказа
                    </div>
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-ad-cream/70 font-body">
                            {item.emoji} {item.name} × {item.quantity}
                          </span>
                          <span className="font-display font-semibold text-ad-cream">{item.total} ₽</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between font-display font-black text-ad-cream">
                      <span>Итого</span>
                      <span className="text-ad-orange">{order.total} ₽</span>
                    </div>
                  </div>

                  {order.delivery_type === "delivery" && order.address && (
                    <div className="flex items-start gap-3 p-3 bg-white/3 rounded-2xl border border-white/5">
                      <Icon name="MapPin" size={16} className="text-ad-orange mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-ad-cream/40 font-body">Адрес доставки</div>
                        <div className="text-sm text-ad-cream font-body">{order.address}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-white/3 rounded-2xl border border-white/5">
                    <Icon name="Clock" size={16} className="text-ad-gold flex-shrink-0" />
                    <div>
                      <div className="text-xs text-ad-cream/40 font-body">Примерное время</div>
                      <div className="text-sm text-ad-cream font-body font-semibold">~45 минут</div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          <button onClick={onClose} className="btn-primary w-full py-3.5 text-sm">
            Продолжить покупки
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Checkout({ cart, onSuccess, onBack }: Props) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    delivery_type: "delivery",
    address: user?.addresses?.[0]?.address || "",
    apartment: user?.addresses?.[0]?.apartment || "",
    entrance: "",
    floor: "",
    intercom: "",
    comment: "",
    delivery_time: "asap",
    payment_method: "cash",
    promo_code: "",
  });

  const [promoResult, setPromoResult] = useState<{ discount: number; title: string } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = promoResult?.discount || 0;
  const deliveryCost = form.delivery_type === "delivery" && subtotal < 800 ? 99 : 0;
  const total = Math.max(0, subtotal - discount + deliveryCost);

  const checkPromo = async () => {
    setPromoError("");
    if (!form.promo_code.trim()) return;
    try {
      const { products } = await import("@/lib/api");
      const res = await products.checkPromo(form.promo_code.trim().toUpperCase(), subtotal);
      setPromoResult({ discount: res.discount, title: res.title });
    } catch (e: unknown) {
      setPromoError(e instanceof Error ? e.message : "Промокод недействителен");
      setPromoResult(null);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Укажите имя";
    if (form.phone.replace(/\D/g, "").length < 11) e.phone = "Некорректный телефон";
    if (form.delivery_type === "delivery" && !form.address.trim()) e.address = "Укажите адрес";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await ordersApi.create({
        items: cart.map(i => ({ product_id: i.id, name: i.name, emoji: i.emoji, price: i.price, quantity: i.qty })),
        customer_name: form.name,
        customer_phone: form.phone,
        delivery_type: form.delivery_type,
        address: form.delivery_type === "delivery" ? form.address : undefined,
        apartment: form.apartment || undefined,
        entrance: form.entrance || undefined,
        floor: form.floor || undefined,
        intercom: form.intercom || undefined,
        comment: form.comment || undefined,
        delivery_time: form.delivery_time,
        payment_method: form.payment_method,
        promo_code: form.promo_code || undefined,
      });
      onSuccess(res.order_id);
    } catch (e: unknown) {
      setErrors({ submit: e instanceof Error ? e.message : "Ошибка оформления заказа" });
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ id, label, placeholder, type = "text", value, onChange, error }: {
    id: string; label: string; placeholder: string; type?: string;
    value: string; onChange: (v: string) => void; error?: string;
  }) => (
    <div>
      <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        className={`input-dark w-full px-4 py-3 text-sm ${error ? "border-red-500/50" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen font-body" style={{ background: "linear-gradient(180deg,#03270D,#101510)" }}>
      {/* Header */}
      <div className="header-blur border-b border-ad-orange/10 px-4 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
          <Icon name="ArrowLeft" size={18} className="text-ad-cream" />
        </button>
        <div>
          <span className="font-display font-black text-lg text-ad-cream">Оформление заказа</span>
          <span className="text-ad-cream/40 text-xs font-body ml-2">{cart.length} товар{cart.length > 1 ? "а" : ""}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Contact */}
        <div className="bg-dark-card rounded-3xl p-6 space-y-4 border border-ad-orange/10">
          <h3 className="font-display font-bold text-ad-cream text-base flex items-center gap-2">
            <Icon name="User" size={16} className="text-ad-orange" /> Контакты
          </h3>
          <Field id="name" label="Имя" placeholder="Ваше имя"
            value={form.name} onChange={v => setForm({...form, name: v})} error={errors.name} />
          <Field id="phone" label="Телефон" placeholder="+7 (___) ___-__-__" type="tel"
            value={form.phone} onChange={v => setForm({...form, phone: v})} error={errors.phone} />
        </div>

        {/* Delivery type */}
        <div className="bg-dark-card rounded-3xl p-6 space-y-4 border border-ad-orange/10">
          <h3 className="font-display font-bold text-ad-cream text-base flex items-center gap-2">
            <Icon name="MapPin" size={16} className="text-ad-orange" /> Способ получения
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: "delivery", label: "🚴 Доставка", sub: "~45 мин" },
              { v: "pickup", label: "🏪 Самовывоз", sub: "ул. Калинина, 3" },
            ].map(o => (
              <button key={o.v} onClick={() => setForm({...form, delivery_type: o.v})}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  form.delivery_type === o.v
                    ? "bg-ad-orange/20 border-ad-orange text-ad-orange"
                    : "bg-white/3 border-white/10 text-ad-cream/70 hover:border-ad-orange/30"
                }`}>
                <div className="font-display font-bold text-sm">{o.label}</div>
                <div className="text-xs opacity-60 mt-1">{o.sub}</div>
              </button>
            ))}
          </div>

          {form.delivery_type === "delivery" && (
            <div className="space-y-3">
              <Field id="address" label="Адрес" placeholder="Улица, дом"
                value={form.address} onChange={v => setForm({...form, address: v})} error={errors.address} />
              <div className="grid grid-cols-3 gap-3">
                <Field id="apt" label="Кв." placeholder="12"
                  value={form.apartment} onChange={v => setForm({...form, apartment: v})} />
                <Field id="ent" label="Подъезд" placeholder="1"
                  value={form.entrance} onChange={v => setForm({...form, entrance: v})} />
                <Field id="flr" label="Этаж" placeholder="5"
                  value={form.floor} onChange={v => setForm({...form, floor: v})} />
              </div>
              <Field id="int" label="Домофон" placeholder="1234#56"
                value={form.intercom} onChange={v => setForm({...form, intercom: v})} />
            </div>
          )}

          {form.delivery_type === "pickup" && (
            <div className="flex items-center gap-3 p-4 bg-ad-orange/5 rounded-2xl border border-ad-orange/15">
              <Icon name="MapPin" size={18} className="text-ad-orange flex-shrink-0" />
              <div>
                <div className="font-display font-semibold text-ad-cream text-sm">Адрес самовывоза</div>
                <div className="text-ad-cream/60 text-sm font-body">Белгород, ул. Калинина, 3</div>
              </div>
            </div>
          )}
        </div>

        {/* Time */}
        <div className="bg-dark-card rounded-3xl p-6 space-y-4 border border-ad-orange/10">
          <h3 className="font-display font-bold text-ad-cream text-base flex items-center gap-2">
            <Icon name="Clock" size={16} className="text-ad-orange" /> Время
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: "asap", label: "⚡ Как можно скорее", sub: "~45 минут" },
              { v: "scheduled", label: "🕐 Ко времени", sub: "Укажу время" },
            ].map(o => (
              <button key={o.v} onClick={() => setForm({...form, delivery_time: o.v})}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  form.delivery_time === o.v
                    ? "bg-ad-orange/20 border-ad-orange text-ad-orange"
                    : "bg-white/3 border-white/10 text-ad-cream/70 hover:border-ad-orange/30"
                }`}>
                <div className="font-display font-bold text-sm">{o.label}</div>
                <div className="text-xs opacity-60 mt-1">{o.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment */}
        <div className="bg-dark-card rounded-3xl p-6 space-y-4 border border-ad-orange/10">
          <h3 className="font-display font-bold text-ad-cream text-base flex items-center gap-2">
            <Icon name="CreditCard" size={16} className="text-ad-orange" /> Оплата
          </h3>
          <div className="space-y-2">
            {[
              { v: "cash", label: "💵 Наличными курьеру" },
              { v: "transfer", label: "📲 Перевод на карту" },
              { v: "terminal", label: "💳 По терминалу" },
            ].map(o => (
              <button key={o.v} onClick={() => setForm({...form, payment_method: o.v})}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                  form.payment_method === o.v
                    ? "bg-ad-orange/20 border-ad-orange"
                    : "bg-white/3 border-white/10 hover:border-ad-orange/30"
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  form.payment_method === o.v ? "border-ad-orange bg-ad-orange" : "border-white/30"
                }`} />
                <span className={`font-body text-sm ${form.payment_method === o.v ? "text-ad-cream" : "text-ad-cream/70"}`}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="bg-dark-card rounded-3xl p-6 space-y-3 border border-ad-orange/10">
          <h3 className="font-display font-bold text-ad-cream text-base flex items-center gap-2">
            <Icon name="MessageSquare" size={16} className="text-ad-orange" /> Комментарий
          </h3>
          <textarea
            className="input-dark w-full px-4 py-3 text-sm resize-none h-20"
            placeholder="Пожелания к заказу, уточнения..."
            value={form.comment}
            onChange={e => setForm({...form, comment: e.target.value})}
          />
        </div>

        {/* Promo */}
        <div className="bg-dark-card rounded-3xl p-6 space-y-3 border border-ad-orange/10">
          <h3 className="font-display font-bold text-ad-cream text-base flex items-center gap-2">
            <Icon name="Tag" size={16} className="text-ad-orange" /> Промокод
          </h3>
          <div className="flex gap-2">
            <input
              className="input-dark flex-1 px-4 py-3 text-sm uppercase"
              placeholder="ПЕРВЫЙ / ХЭППИ"
              value={form.promo_code}
              onChange={e => { setForm({...form, promo_code: e.target.value}); setPromoError(""); setPromoResult(null); }}
            />
            <button onClick={checkPromo} className="btn-primary px-5 py-3 text-sm whitespace-nowrap">
              Применить
            </button>
          </div>
          {promoResult && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Icon name="CheckCircle" size={14} /> {promoResult.title} — скидка {promoResult.discount} ₽
            </div>
          )}
          {promoError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <Icon name="AlertCircle" size={14} /> {promoError}
            </div>
          )}
          <p className="text-ad-cream/30 text-xs font-body">⚠ Скидки и акции не суммируются</p>
        </div>

        {/* Summary */}
        <div className="bg-dark-card rounded-3xl p-6 space-y-3 border border-ad-orange/10">
          <h3 className="font-display font-bold text-ad-cream text-base">Итого</h3>
          <div className="space-y-2">
            {cart.map(i => (
              <div key={i.id} className="flex justify-between text-sm text-ad-cream/60 font-body">
                <span>{i.emoji} {i.name} × {i.qty}</span>
                <span>{i.price * i.qty} ₽</span>
              </div>
            ))}
          </div>
          <div className="section-divider" />
          <div className="space-y-2 text-sm font-body">
            <div className="flex justify-between text-ad-cream/60">
              <span>Сумма</span><span>{subtotal} ₽</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Скидка</span><span>−{discount} ₽</span>
              </div>
            )}
            <div className="flex justify-between text-ad-cream/60">
              <span>Доставка</span>
              <span className={deliveryCost === 0 ? "text-green-400" : "text-ad-cream"}>
                {deliveryCost === 0 ? "Бесплатно" : `${deliveryCost} ₽`}
              </span>
            </div>
          </div>
          <div className="section-divider" />
          <div className="flex justify-between font-display font-black text-xl text-ad-cream">
            <span>К оплате</span>
            <span className="text-ad-orange">{total} ₽</span>
          </div>
        </div>

        {errors.submit && (
          <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
            <Icon name="AlertCircle" size={16} /> {errors.submit}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full py-5 text-lg glow-orange disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Icon name="Loader2" size={20} className="animate-spin" /> Оформляем...
            </span>
          ) : `Заказать · ${total} ₽`}
        </button>

        <p className="text-center text-xs text-ad-cream/30 font-body pb-4">
          Нажимая «Заказать», вы соглашаетесь с условиями доставки и политикой конфиденциальности
        </p>
      </div>
    </div>
  );
}
