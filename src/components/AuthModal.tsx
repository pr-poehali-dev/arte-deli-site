import { useState } from "react";
import { auth } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Icon from "@/components/ui/icon";

interface Props {
  onClose: () => void;
}

export default function AuthModal({ onClose }: Props) {
  const { login } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 11);
    if (d.length === 0) return "";
    if (d.length <= 1) return `+7`;
    if (d.length <= 4) return `+7 (${d.slice(1)}`;
    if (d.length <= 7) return `+7 (${d.slice(1, 4)}) ${d.slice(4)}`;
    if (d.length <= 9) return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
  };

  const rawPhone = () => {
    const d = phone.replace(/\D/g, "");
    return "+7" + d.slice(1);
  };

  const sendOtp = async () => {
    setError("");
    const p = rawPhone();
    if (p.length < 12) { setError("Введите корректный номер"); return; }
    setLoading(true);
    try {
      const res = await auth.sendOtp(p);
      if (res.dev_code) setDevCode(res.dev_code);
      setStep("code");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка отправки кода");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    if (code.length < 4) { setError("Введите 4-значный код"); return; }
    setLoading(true);
    try {
      const res = await auth.verifyOtp(rawPhone(), code);
      login(res.token, res.user as Parameters<typeof login>[1]);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Неверный код");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] modal-overlay flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div
        className="w-full max-w-sm bg-gradient-to-b from-[#0d2010] to-[#071507] rounded-t-3xl sm:rounded-3xl p-6 space-y-6 border border-ad-orange/15 animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-black text-xl text-ad-cream">
              {step === "phone" ? "Войти / Зарегистрироваться" : "Введите код"}
            </h2>
            <p className="text-ad-cream/50 text-sm font-body mt-1">
              {step === "phone"
                ? "Введите номер телефона — мы пришлём код"
                : `Код отправлен на ${phone}`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
            <Icon name="X" size={16} className="text-ad-cream/50" />
          </button>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-2 uppercase tracking-wider">
                Номер телефона
              </label>
              <input
                className="input-dark w-full px-4 py-3.5 text-base tracking-wide"
                type="tel"
                placeholder="+7 (___) ___-__-__"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
                onKeyDown={e => e.key === "Enter" && sendOtp()}
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <Icon name="AlertCircle" size={14} /> {error}
              </div>
            )}
            <button
              onClick={sendOtp}
              disabled={loading}
              className="btn-primary w-full py-4 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="Loader2" size={16} className="animate-spin" /> Отправляем...
                </span>
              ) : "Получить код"}
            </button>
            <p className="text-center text-xs text-ad-cream/30 font-body">
              Нажимая «Получить код», вы соглашаетесь с политикой конфиденциальности
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {devCode && (
              <div className="bg-ad-orange/10 border border-ad-orange/25 rounded-2xl p-3 text-center">
                <div className="text-xs text-ad-orange/60 font-display uppercase tracking-wider mb-1">Код (тест)</div>
                <div className="text-3xl font-black font-display text-ad-orange tracking-widest">{devCode}</div>
              </div>
            )}
            <div>
              <label className="block text-xs font-display font-semibold text-ad-cream/50 mb-2 uppercase tracking-wider">
                4-значный код
              </label>
              <input
                className="input-dark w-full px-4 py-3.5 text-center text-2xl font-black font-display tracking-widest"
                type="number"
                placeholder="• • • •"
                maxLength={4}
                value={code}
                onChange={e => setCode(e.target.value.slice(0, 4))}
                onKeyDown={e => e.key === "Enter" && verifyOtp()}
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <Icon name="AlertCircle" size={14} /> {error}
              </div>
            )}
            <button
              onClick={verifyOtp}
              disabled={loading}
              className="btn-primary w-full py-4 text-base font-bold disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="Loader2" size={16} className="animate-spin" /> Проверяем...
                </span>
              ) : "Войти"}
            </button>
            <button
              onClick={() => { setStep("phone"); setCode(""); setError(""); setDevCode(null); }}
              className="w-full text-center text-ad-cream/40 text-sm hover:text-ad-cream/70 transition-colors"
            >
              ← Изменить номер
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
