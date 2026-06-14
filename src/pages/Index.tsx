import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";
import Checkout, { OrderTracker } from "@/pages/Checkout";
import Cabinet from "@/pages/Cabinet";
import Admin from "@/pages/Admin";
import StoriesViewer from "@/components/StoriesViewer";
import ProductModal from "@/components/ProductModal";
import { Story, products as productsApi } from "@/lib/api";
import { useSiteSettings } from "@/hooks/useSiteSettings";

/* ==================== DATA ==================== */

const PIZZAS = [
  { id: 1, name: "Чикен Барбекю", price: 680, tags: ["popular"], emoji: "🍗", desc: "Курица, соус барбекю, красный лук, маринованные огурчики, сыр моцарелла", composition: "Тесто, соус барбекю, куриное филе, красный лук, огурчики маринованные, моцарелла", size: "32 см" },
  { id: 2, name: "Салями с Курицей", price: 540, tags: ["hit"], emoji: "🍕", desc: "Салями, куриное филе, болгарский перец, томаты, моцарелла", composition: "Тесто, томатный соус, салями, куриное филе, перец болгарский, томаты, моцарелла", size: "32 см" },
  { id: 3, name: "Пепперони", price: 500, tags: ["classic"], emoji: "🌶️", desc: "Классическая пепперони с пикантной колбасой и сырным бортиком", composition: "Тесто, томатный соус, пепперони, моцарелла", size: "32 см" },
  { id: 4, name: "Охотничья", price: 660, tags: ["hit"], emoji: "🏹", desc: "Охотничьи колбаски, бекон, грибы, лук, томаты, сыр", composition: "Тесто, томатный соус, охотничьи колбаски, бекон, грибы, лук, томаты, моцарелла", size: "32 см" },
  { id: 5, name: "Мясная", price: 560, tags: [], emoji: "🥩", desc: "Три вида мяса: говядина, курица, ветчина с томатным соусом", composition: "Тесто, томатный соус, говядина, куриное филе, ветчина, лук, моцарелла", size: "32 см" },
  { id: 6, name: "Маргарита", price: 440, tags: ["classic"], emoji: "🍅", desc: "Классика итальянской кухни. Томаты, базилик, моцарелла", composition: "Тесто, томатный соус, томаты, базилик, моцарелла", size: "32 см" },
  { id: 7, name: "Курица с Грибами", price: 520, tags: [], emoji: "🍄", desc: "Нежное куриное филе с ароматными лесными грибами и сливочным соусом", composition: "Тесто, сливочный соус, куриное филе, грибы, лук, моцарелла", size: "32 см" },
  { id: 8, name: "Карбонара", price: 580, tags: ["new"], emoji: "🥓", desc: "Бекон, сливочный соус, яйцо, пармезан — как настоящая паста", composition: "Тесто, сливочный соус, бекон, яйцо, пармезан, моцарелла", size: "32 см" },
  { id: 9, name: "Диабло", price: 540, tags: ["hot"], emoji: "🔥", desc: "Острая пицца с халапеньо, чили и пикантным мясом для смельчаков", composition: "Тесто, острый томатный соус, пепперони, халапеньо, перец чили, моцарелла", size: "32 см" },
  { id: 10, name: "Деревенская", price: 680, tags: ["popular"], emoji: "🌿", desc: "Картофель, бекон, сметанный соус, зелень, деревенские специи", composition: "Тесто, сметанный соус, картофель, бекон, зелёный лук, укроп, моцарелла", size: "32 см" },
  { id: 11, name: "Гавайская", price: 540, tags: [], emoji: "🍍", desc: "Курица, ананас, сладкий соус — тропический взрыв вкуса", composition: "Тесто, томатный соус, куриное филе, ананас консервированный, моцарелла", size: "32 см" },
  { id: 12, name: "Ветчина Грибы", price: 520, tags: [], emoji: "🍖", desc: "Нежная ветчина с грибами и сливочным соусом", composition: "Тесто, сливочный соус, ветчина, грибы, лук, моцарелла", size: "32 см" },
];

const PROMOS = [
  { id: 1, icon: "✨", title: "Скидка 15% на первый заказ", desc: "Промокод ПЕРВЫЙ — только для новых клиентов", code: "ПЕРВЫЙ", color: "from-orange-500/10 to-orange-600/5", border: "border-orange-500/20" },
  { id: 2, icon: "🎁", title: "Пицца в подарок", desc: "Закажи 2 пиццы — получи «Ветчина Грибы» в подарок", code: null, color: "from-green-500/10 to-green-600/5", border: "border-green-500/20" },
  { id: 3, icon: "🎂", title: "Скидка 15% в День Рождения", desc: "Промокод ХЭППИ — укажи дату рождения в профиле", code: "ХЭППИ", color: "from-pink-500/10 to-pink-600/5", border: "border-pink-500/20" },
  { id: 4, icon: "🍕", title: "Сет 3 пиццы за 1599 ₽", desc: "Чикен Барбекю + Салями с Курицей + Ветчина Грибы", code: null, color: "from-yellow-500/10 to-yellow-600/5", border: "border-yellow-500/20" },
];

const REVIEWS = [
  { name: "Анастасия К.", rating: 5, text: "Заказываю уже третий раз — пицца всегда горячая и очень вкусная! Диабло просто огонь 🔥", date: "3 дня назад" },
  { name: "Михаил В.", rating: 5, text: "Курьер приехал за 35 минут. Деревенская — моя любимая, рекомендую всем!", date: "1 неделю назад" },
  { name: "Светлана М.", rating: 5, text: "Заказала сет из трёх пицц — невероятно выгодно и вкусно. Буду заказывать снова!", date: "2 недели назад" },
  { name: "Дмитрий О.", rating: 4, text: "Отличное тесто, тонкое как надо. Карбонара понравилась больше всего, очень нежная.", date: "3 недели назад" },
];

/* ==================== UTILS ==================== */

function getWorkStatus(): { text: string; type: "open" | "closed" | "soon" | "warning" } {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const total = h * 60 + m;
  const open = 10 * 60;
  const close = 22 * 60;

  if (total >= open && total < close - 60) return { text: "Открыто до 22:00", type: "open" };
  if (total >= close - 60 && total < close) return { text: "Закроется в 22:00", type: "warning" };
  if (total >= close) return { text: "Закрыто · Откроется в 10:00", type: "closed" };
  return { text: "Откроется в 10:00", type: "closed" };
}

/* ==================== STATUS BADGE ==================== */

function StatusBadge() {
  const [status, setStatus] = useState(getWorkStatus());
  useEffect(() => {
    const i = setInterval(() => setStatus(getWorkStatus()), 60000);
    return () => clearInterval(i);
  }, []);

  const cls = status.type === "open" ? "status-open" : status.type === "warning" ? "status-soon" : "status-closed";
  const dot = status.type === "open" ? "bg-green-400" : status.type === "warning" ? "bg-orange-400" : "bg-red-400";

  return (
    <span className={`${cls} flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-display`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status.type === "open" ? "animate-pulse" : ""}`} />
      {status.text}
    </span>
  );
}

/* ==================== HEADER ==================== */

function Header({ cartCount, onCartClick, onAuthClick, onCabinetClick, onAdminClick, phone, vkUrl }: {
  cartCount: number; onCartClick: () => void;
  onAuthClick: () => void; onCabinetClick: () => void; onAdminClick: () => void;
  phone?: string; vkUrl?: string;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role && ["admin","manager","cook","courier","content"].includes(user.role);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const prevCount = useRef(cartCount);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (cartCount > prevCount.current) {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 500);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "header-blur shadow-lg shadow-black/20" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ad-orange to-ad-gold flex items-center justify-center shadow-lg glow-orange-sm">
              <span className="text-lg">🍕</span>
            </div>
            <div>
              <span className="font-display font-black text-xl text-ad-cream tracking-wider">ARTE</span>
              <span className="font-display font-black text-xl text-ad-orange tracking-wider"> DELI</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#menu" className="text-ad-cream/70 hover:text-ad-cream text-sm font-medium font-body transition-colors">Меню</a>
            <a href="#promos" className="text-ad-orange hover:text-ad-gold text-sm font-semibold font-body transition-colors flex items-center gap-1">
              <span>🔥</span> Акции
            </a>
            <a href="#delivery" className="text-ad-cream/70 hover:text-ad-cream text-sm font-medium font-body transition-colors">Доставка</a>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2 md:gap-3">
            <StatusBadge />
            <a href={`tel:${(phone || "+7 (995) 138-03-31").replace(/\D/g, "")}`} className="hidden md:flex items-center gap-2 text-ad-cream/80 hover:text-ad-cream transition-colors text-sm font-medium">
              <Icon name="Phone" size={15} />
              <span>{phone || "+7 (995) 138-03-31"}</span>
            </a>
            <a href={vkUrl || "https://vk.com/artedeli"} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all hover:scale-105 text-ad-cream text-sm font-bold">
              VK
            </a>
            <button
              onClick={onCartClick}
              className={`relative w-10 h-10 rounded-full bg-ad-orange/20 hover:bg-ad-orange/30 border border-ad-orange/30 flex items-center justify-center transition-all hover:scale-105 ${bouncing ? "cart-bounce" : ""}`}
            >
              <Icon name="ShoppingCart" size={18} className="text-ad-orange" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-ad-orange rounded-full text-xs font-bold font-display text-white flex items-center justify-center animate-scale-in">
                  {cartCount}
                </span>
              )}
            </button>
            {/* Auth / Cabinet */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                {isAdmin && (
                  <button onClick={onAdminClick} title="Админ-панель"
                    className="w-9 h-9 rounded-full bg-ad-orange/20 border border-ad-orange/30 flex items-center justify-center hover:bg-ad-orange/30 transition-all">
                    <Icon name="Settings" size={16} className="text-ad-orange" />
                  </button>
                )}
                <button onClick={onCabinetClick} className="flex items-center gap-2 btn-outline text-sm px-4 py-2">
                  <Icon name="User" size={15} />
                  {user.name ? user.name.split(" ")[0] : "Кабинет"}
                </button>
              </div>
            ) : (
              <button onClick={onAuthClick} className="hidden md:flex items-center gap-2 btn-outline text-sm px-4 py-2">
                <Icon name="User" size={15} />
                Войти
              </button>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-9 h-9 flex items-center justify-center text-ad-cream">
              <Icon name={menuOpen ? "X" : "Menu"} size={22} />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden mobile-menu border-t border-white/5 animate-fade-in-down">
          <div className="px-4 py-6 flex flex-col gap-4">
            <a href="#menu" onClick={() => setMenuOpen(false)} className="text-ad-cream/80 font-medium py-2 border-b border-white/5">Меню</a>
            <a href="#promos" onClick={() => setMenuOpen(false)} className="text-ad-orange font-semibold py-2 border-b border-white/5 flex items-center gap-2">🔥 Акции</a>
            <a href="#delivery" onClick={() => setMenuOpen(false)} className="text-ad-cream/80 font-medium py-2 border-b border-white/5">Доставка</a>
            <a href={`tel:${(phone || "+7 (995) 138-03-31").replace(/\D/g, "")}`} className="flex items-center gap-2 text-ad-cream/80 py-2">
              <Icon name="Phone" size={16} /> {phone || "+7 (995) 138-03-31"}
            </a>
            {user ? (
              <div className="flex flex-col gap-2 mt-2">
                {isAdmin && (
                  <button onClick={() => { setMenuOpen(false); onAdminClick(); }} className="btn-outline py-3 text-sm w-full flex items-center justify-center gap-2">
                    <Icon name="Settings" size={15} /> Админ-панель
                  </button>
                )}
                <button onClick={() => { setMenuOpen(false); onCabinetClick(); }} className="btn-primary py-3 text-sm w-full">
                  <Icon name="User" size={15} className="inline mr-2" /> {user.name || "Кабинет"}
                </button>
              </div>
            ) : (
              <button onClick={() => { setMenuOpen(false); onAuthClick(); }} className="btn-outline py-3 text-sm w-full mt-2">
                <Icon name="User" size={15} className="inline mr-2" /> Войти в кабинет
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* ==================== HERO ==================== */

function Hero({ onOrder, settings }: {
  onOrder: () => void;
  settings: { hero_image_url: string; hero_title: string; hero_subtitle: string; hero_btn1: string; hero_btn2: string };
}) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-hero-gradient">
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #FF7A00 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #F09501 0%, transparent 70%)" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-ad-orange/10 border border-ad-orange/25 rounded-full px-4 py-2 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-ad-orange animate-pulse" />
              <span className="text-ad-orange text-sm font-semibold font-display">Доставка по Белгороду</span>
            </div>

            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] animate-fade-in-up delay-100">
              <span className="text-ad-cream">{settings.hero_title || "Горячая пицца ARTE DELI"}</span>
            </h1>

            <p className="text-ad-cream/65 text-lg sm:text-xl leading-relaxed max-w-md animate-fade-in-up delay-200 font-body">
              {settings.hero_subtitle || "Сочная, ароматная, прямо из печи — доставим горячей до вашей двери ежедневно с 10:00 до 22:00"}
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300">
              <button onClick={onOrder} className="btn-primary px-8 py-4 text-base glow-orange">
                {settings.hero_btn1 || "Заказать сейчас"}
              </button>
              <a href="#promos" className="btn-outline px-8 py-4 text-base">
                {settings.hero_btn2 || "Смотреть акции 🔥"}
              </a>
            </div>

            <div className="flex flex-wrap gap-8 animate-fade-in-up delay-400">
              {[
                { num: "12+", label: "видов пиццы" },
                { num: "32 см", label: "один размер" },
                { num: "~45 мин", label: "доставка" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-black font-display text-ad-orange">{s.num}</div>
                  <div className="text-sm text-ad-cream/50 font-body">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center animate-scale-in delay-300">
            <div className="absolute inset-0 rounded-full blur-3xl opacity-30"
              style={{ background: "radial-gradient(circle, #FF7A00, transparent 70%)" }} />
            <div className="relative w-full max-w-[480px] aspect-square">
              <img
                src={settings.hero_image_url || "https://cdn.poehali.dev/projects/2f8cc4dc-0c5c-4aba-b2ad-7ae7a8eb6cb1/files/45930abd-2f75-4f8a-8333-be6fa88839bc.jpg"}
                alt={settings.hero_title || "Горячая пицца ARTE DELI"}
                className="w-full h-full object-cover rounded-full animate-float"
                style={{ boxShadow: "0 0 80px rgba(255,122,0,0.35), 0 0 160px rgba(255,122,0,0.15)" }}
              />
              <div className="absolute top-8 right-0 bg-ad-orange rounded-2xl px-4 py-3 shadow-xl animate-slide-in-right delay-500">
                <div className="text-xs text-white/80 font-display">от</div>
                <div className="text-2xl font-black font-display text-white">440 ₽</div>
              </div>
              <div className="absolute bottom-10 left-0 card-premium rounded-2xl px-4 py-3 shadow-xl animate-fade-in-up delay-600">
                <div className="text-xs text-ad-gold font-display font-bold">🚴 Доставка</div>
                <div className="text-sm font-black font-display text-ad-cream">~45 минут</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== STORIES ==================== */

function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);

  useEffect(() => {
    productsApi.stories().then(res => {
      if (res.stories?.length) setStories(res.stories.filter(s => s.is_active));
    }).catch(() => {
      // fallback to static
      setStories([
        { id: 1, title: "Акции", emoji: "🔥", bg: "from-orange-600 to-red-700", image_url: null, content: "Скидки и акции ARTE DELI", button_text: "Смотреть", button_link: null, is_active: true, sort_order: 1, views: 0 },
        { id: 2, title: "Новинки", emoji: "🍕", bg: "from-green-700 to-green-900", image_url: null, content: "Новые позиции в меню", button_text: "В меню", button_link: null, is_active: true, sort_order: 2, views: 0 },
        { id: 3, title: "Подарки", emoji: "🎁", bg: "from-yellow-600 to-orange-700", image_url: null, content: "При заказе 2 пицц — третья в подарок!", button_text: "Заказать", button_link: null, is_active: true, sort_order: 3, views: 0 },
        { id: 4, title: "День рождения", emoji: "🎂", bg: "from-pink-600 to-rose-800", image_url: null, content: "Скидка 15% в день рождения. Промокод ХЭППИ", button_text: "Активировать", button_link: null, is_active: true, sort_order: 4, views: 0 },
        { id: 5, title: "Хиты", emoji: "🏆", bg: "from-amber-600 to-yellow-700", image_url: null, content: "Самые популярные пиццы ARTE DELI", button_text: "Выбрать", button_link: null, is_active: true, sort_order: 5, views: 0 },
      ]);
    });
  }, []);

  if (!stories.length) return null;

  return (
    <section className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {stories.map((s, i) => (
            <div
              key={s.id}
              className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 group"
              onClick={() => { setViewerIdx(i); setViewerOpen(true); }}
            >
              <div className="story-ring w-16 h-16 group-hover:scale-105 transition-transform duration-200">
                <div className="story-ring-inner w-full h-full flex items-center justify-center">
                  {s.image_url
                    ? <img src={s.image_url} alt={s.title} className="w-full h-full rounded-full object-cover" />
                    : <div className={`w-full h-full rounded-full bg-gradient-to-br ${s.bg} flex items-center justify-center text-2xl`}>{s.emoji}</div>
                  }
                </div>
              </div>
              <span className="text-xs text-ad-cream/70 font-body text-center whitespace-nowrap">{s.title}</span>
            </div>
          ))}
        </div>
      </div>
      {viewerOpen && (
        <StoriesViewer
          stories={stories}
          initialIndex={viewerIdx}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </section>
  );
}

/* ==================== PIZZA CARD ==================== */

function PizzaCard({ pizza, onAdd, onOpenDetail }: {
  pizza: typeof PIZZAS[0];
  onAdd: (id: number) => void;
  onOpenDetail: (pizza: typeof PIZZAS[0]) => void;
}) {
  const [added, setAdded] = useState(false);

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (added) return;
    setAdded(true);
    onAdd(pizza.id);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div
      className="pizza-card bg-dark-card rounded-3xl overflow-hidden cursor-pointer relative group"
      onClick={() => onOpenDetail(pizza)}
    >
      {pizza.tags.length > 0 && (
        <div className="absolute top-3 left-3 z-10 flex gap-1 flex-wrap">
          {pizza.tags.map(t => (
            <span key={t} className={t === "hot" ? "tag-hot" : t === "new" ? "tag-new" : "tag-popular"}>
              {t === "hot" ? "🔥 Острая" : t === "new" ? "✨ Новинка" : t === "popular" ? "⭐ Хит" : "👑 Классика"}
            </span>
          ))}
        </div>
      )}
      <div className="relative h-44 bg-gradient-to-br from-ad-dark to-ad-darker overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-7xl pizza-img">{pizza.emoji}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-bold text-ad-cream text-base leading-tight">{pizza.name}</h3>
          <p className="text-ad-cream/50 text-xs mt-1 font-body leading-relaxed line-clamp-2">{pizza.desc}</p>
        </div>
        <div className="text-ad-cream/40 text-xs font-body flex items-center gap-1">
          <Icon name="Ruler" size={11} className="text-ad-gold" />
          {pizza.size} · тонкое тесто
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-display font-black text-xl text-ad-cream">{pizza.price} ₽</span>
          <button
            onClick={(e) => handleAdd(e)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold font-display transition-all duration-300 ${
              added ? "bg-green-500 text-white scale-95" : "btn-primary"
            }`}
          >
            {added ? (<><Icon name="Check" size={14} /> Добавлено</>) : (<><Icon name="Plus" size={14} /> В корзину</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== MENU ==================== */

function MenuSection({ onAdd, onOpenDetail }: {
  onAdd: (id: number) => void;
  onOpenDetail: (pizza: typeof PIZZAS[0]) => void;
}) {
  return (
    <section id="menu" className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-ad-orange text-sm font-bold font-display uppercase tracking-widest mb-2">🍕 Наше меню</div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-ad-cream">Все пиццы</h2>
            <p className="text-ad-cream/50 font-body mt-2">32 см · тонкое тесто · обычный бортик</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-ad-cream/40 font-body">
            <Icon name="Info" size={14} />
            <span>Нажми на карточку — подробнее</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {PIZZAS.map((pizza, i) => (
            <div key={pizza.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <PizzaCard pizza={pizza} onAdd={onAdd} onOpenDetail={onOpenDetail} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================== PROMOS ==================== */

function PromoSection() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section id="promos" className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-ad-orange text-sm font-bold font-display uppercase tracking-widest mb-3">🔥 Выгодно</div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-ad-cream">Акции и скидки</h2>
          <p className="text-ad-cream/50 font-body mt-3">Скидки и акции не суммируются</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROMOS.map((p, i) => (
            <div
              key={p.id}
              className="promo-card p-6 space-y-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-4xl">{p.icon}</div>
              <div>
                <h3 className="font-display font-bold text-ad-cream text-base leading-tight">{p.title}</h3>
                <p className="text-ad-cream/55 text-sm font-body mt-2 leading-relaxed">{p.desc}</p>
              </div>
              {p.code && (
                <button
                  onClick={() => copy(p.code!)}
                  className="flex items-center gap-2 bg-ad-orange/10 border border-ad-orange/25 rounded-xl px-3 py-2 text-sm font-bold font-display text-ad-orange hover:bg-ad-orange/20 transition-all w-full justify-between"
                >
                  <span>{p.code}</span>
                  <Icon name={copied === p.code ? "Check" : "Copy"} size={14} className={copied === p.code ? "text-green-400" : "text-ad-orange"} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================== MOOD PIZZA ==================== */

function MoodPizzaSection({ onAdd, onOpenDetail }: {
  onAdd: (id: number) => void;
  onOpenDetail: (pizza: typeof PIZZAS[0]) => void;
}) {
  const moods = [
    { emoji: "😄", label: "Весёлое", pizzas: [1, 11, 3] },
    { emoji: "🔥", label: "Острое", pizzas: [9, 4, 1] },
    { emoji: "🍃", label: "Лёгкое", pizzas: [6, 12, 7] },
    { emoji: "🥳", label: "Праздничное", pizzas: [1, 4, 10] },
  ];
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-ad-gold text-sm font-bold font-display uppercase tracking-widest mb-3">✨ Фишка</div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-ad-cream">Пицца по настроению</h2>
          <p className="text-ad-cream/50 font-body mt-3">Выбери настроение — подберём идеальную пиццу</p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {moods.map((m, i) => (
            <button
              key={i}
              onClick={() => setSelected(selected === i ? null : i)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all duration-300 font-display font-bold ${
                selected === i
                  ? "bg-ad-orange text-white border-ad-orange shadow-lg glow-orange-sm scale-105"
                  : "bg-white/3 border-white/10 text-ad-cream/70 hover:border-ad-orange/30 hover:text-ad-cream"
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        {selected !== null && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fade-in-up">
            {moods[selected].pizzas.map(id => {
              const pizza = PIZZAS.find(p => p.id === id)!;
              return <PizzaCard key={id} pizza={pizza} onAdd={onAdd} onOpenDetail={onOpenDetail} />;
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ==================== DELIVERY ==================== */

function DeliverySection() {
  return (
    <section id="delivery" className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <div className="text-ad-orange text-sm font-bold font-display uppercase tracking-widest mb-3">🚴 Быстро и горячо</div>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-ad-cream">Доставка пиццы</h2>
            </div>

            <div className="space-y-4">
              {[
                { icon: "MapPin", title: "Адрес самовывоза", desc: "Белгород, ул. Калинина, 3" },
                { icon: "Clock", title: "Часы работы", desc: "Ежедневно 10:00 — 22:00" },
                { icon: "Timer", title: "Время доставки", desc: "~45 минут по городу" },
                { icon: "CreditCard", title: "Оплата", desc: "Наличные, перевод, терминал — курьеру" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 bg-white/3 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-ad-orange/15 flex items-center justify-center flex-shrink-0">
                    <Icon name={item.icon} size={18} className="text-ad-orange" />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-ad-cream text-sm">{item.title}</div>
                    <div className="text-ad-cream/55 text-sm font-body mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="tel:+79951380331" className="btn-primary px-6 py-3 flex items-center gap-2 text-sm">
                <Icon name="Phone" size={16} /> Позвонить
              </a>
              <button className="btn-outline px-6 py-3 text-sm">Заказать онлайн</button>
            </div>
          </div>

          <div>
            <div className="bg-dark-card rounded-3xl p-8 space-y-6">
              <h3 className="font-display font-bold text-ad-cream text-xl">Зоны доставки</h3>
              <div className="aspect-video bg-gradient-to-br from-ad-dark to-[#071507] rounded-2xl flex items-center justify-center border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Icon name="MapPin" size={40} className="text-ad-orange mx-auto" />
                    <div className="text-ad-cream font-display font-bold">Белгород</div>
                    <div className="text-ad-cream/40 text-sm font-body">ул. Калинина, 3</div>
                  </div>
                </div>
                {[100, 160, 220].map((r, i) => (
                  <div key={i} className="absolute rounded-full border border-ad-orange/20 animate-pulse"
                    style={{ width: r, height: r, left: "50%", top: "50%", transform: "translate(-50%,-50%)", animationDelay: `${i * 0.5}s` }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { zone: "Центр", price: "Бесплатно", min: "от 800 ₽" },
                  { zone: "Север/Юг", price: "100 ₽", min: "от 800 ₽" },
                  { zone: "Запад/Восток", price: "150 ₽", min: "от 1000 ₽" },
                  { zone: "Пригород", price: "200 ₽", min: "от 1200 ₽" },
                ].map((z) => (
                  <div key={z.zone} className="bg-white/3 rounded-xl p-3 border border-white/5">
                    <div className="font-display font-semibold text-ad-cream text-sm">{z.zone}</div>
                    <div className="text-ad-orange text-sm font-bold mt-1">{z.price}</div>
                    <div className="text-ad-cream/40 text-xs mt-0.5 font-body">{z.min}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== REVIEWS ==================== */

function ReviewsSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-ad-gold text-sm font-bold font-display uppercase tracking-widest mb-3">⭐ Отзывы</div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-ad-cream">Нас любят в Белгороде</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {REVIEWS.map((r, i) => (
            <div key={i} className="review-card p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center gap-1">
                {Array.from({ length: r.rating }).map((_, j) => (
                  <span key={j} className="text-ad-gold">⭐</span>
                ))}
              </div>
              <p className="text-ad-cream/75 text-sm font-body leading-relaxed">"{r.text}"</p>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="font-display font-semibold text-ad-cream text-sm">{r.name}</span>
                <span className="text-ad-cream/30 text-xs font-body">{r.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================== CART ==================== */

function CartPanel({ items, onClose, onRemove, onQtyChange, onCheckout }: {
  items: { id: number; qty: number }[];
  onClose: () => void;
  onRemove: (id: number) => void;
  onQtyChange: (id: number, delta: number) => void;
  onCheckout?: () => void;
}) {
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [discount, setDiscount] = useState(0);

  const cartItems = items.map(i => ({ ...PIZZAS.find(p => p.id === i.id)!, qty: i.qty }));
  const subtotal = cartItems.reduce((s, p) => s + p.price * p.qty, 0);
  const total = Math.max(0, subtotal - discount);

  const applyPromo = () => {
    const code = promo.toUpperCase().trim();
    if (code === "ПЕРВЫЙ" || code === "ХЭППИ") {
      setDiscount(Math.round(subtotal * 0.15));
      setPromoApplied(true);
    } else {
      setPromoApplied(false);
      setDiscount(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-full max-w-md bg-gradient-to-b from-[#0d2010] to-[#071507] h-full overflow-y-auto border-l border-ad-orange/10 animate-slide-in-right shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-xl text-ad-cream flex items-center gap-2">
              <Icon name="ShoppingCart" size={20} className="text-ad-orange" />
              Корзина
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <Icon name="X" size={16} className="text-ad-cream/60" />
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="text-6xl">🍕</div>
              <div className="font-display font-bold text-ad-cream/60 text-lg">Корзина пуста</div>
              <p className="text-ad-cream/40 text-sm font-body">Добавьте вкусную пиццу из меню</p>
              <button onClick={onClose} className="btn-outline px-6 py-2 text-sm mt-2">В меню</button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-white/3 rounded-2xl p-3 border border-white/5">
                    <div className="text-3xl flex-shrink-0">{item.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-ad-cream text-sm leading-tight truncate">{item.name}</div>
                      <div className="text-ad-orange font-bold text-sm">{item.price * item.qty} ₽</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onQtyChange(item.id, -1)}
                        className="w-7 h-7 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors text-ad-cream"
                      >
                        <Icon name="Minus" size={12} />
                      </button>
                      <span className="font-display font-bold text-ad-cream w-4 text-center text-sm">{item.qty}</span>
                      <button
                        onClick={() => onQtyChange(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-ad-orange/20 hover:bg-ad-orange/30 flex items-center justify-center transition-colors text-ad-orange"
                      >
                        <Icon name="Plus" size={12} />
                      </button>
                    </div>
                    <button onClick={() => onRemove(item.id)} className="text-ad-cream/30 hover:text-red-400 transition-colors ml-1">
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-display font-bold text-ad-gold uppercase tracking-wider mb-3">Добавить к заказу</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {PIZZAS.filter(p => !items.find(i => i.id === p.id)).slice(0, 4).map(p => (
                    <div key={p.id} className="flex-shrink-0 w-28 bg-white/3 rounded-2xl p-3 text-center border border-white/5">
                      <div className="text-2xl mb-1">{p.emoji}</div>
                      <div className="text-xs font-display font-semibold text-ad-cream leading-tight line-clamp-1">{p.name}</div>
                      <div className="text-ad-orange text-xs font-bold mt-1">{p.price} ₽</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="input-dark flex-1 px-4 py-2.5 text-sm"
                    placeholder="Промокод"
                    value={promo}
                    onChange={e => setPromo(e.target.value)}
                  />
                  <button onClick={applyPromo} className="btn-primary px-4 py-2.5 text-sm whitespace-nowrap">
                    Применить
                  </button>
                </div>
                {promoApplied && (
                  <div className="flex items-center gap-2 text-green-400 text-xs font-display font-semibold">
                    <Icon name="CheckCircle" size={13} /> Промокод применён! Скидка 15%
                  </div>
                )}
              </div>

              <div className="bg-white/3 rounded-2xl p-4 space-y-2 border border-white/5">
                <div className="flex justify-between text-sm font-body text-ad-cream/60">
                  <span>Сумма заказа</span>
                  <span>{subtotal} ₽</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm font-body text-green-400">
                    <span>Скидка</span>
                    <span>−{discount} ₽</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-body text-ad-cream/60">
                  <span>Доставка</span>
                  <span className="text-green-400">Бесплатно</span>
                </div>
                <div className="section-divider my-2" />
                <div className="flex justify-between font-display font-black text-ad-cream text-lg">
                  <span>Итого</span>
                  <span>{total} ₽</span>
                </div>
              </div>

              <button
                onClick={onCheckout}
                className="btn-primary w-full py-4 text-base glow-orange"
              >
                Оформить заказ · {total} ₽
              </button>

              <p className="text-center text-xs text-ad-cream/30 font-body">
                Оплата наличными, переводом или по терминалу курьеру
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== FOOTER ==================== */

function Footer() {
  return (
    <footer className="pt-16 pb-8 px-4 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ad-orange to-ad-gold flex items-center justify-center">
                <span className="text-lg">🍕</span>
              </div>
              <div>
                <span className="font-display font-black text-xl text-ad-cream">ARTE</span>
                <span className="font-display font-black text-xl text-ad-orange"> DELI</span>
              </div>
            </div>
            <p className="text-ad-cream/45 text-sm font-body leading-relaxed">
              Горячая пицца из печи с доставкой по Белгороду. Ежедневно 10:00–22:00.
            </p>
            <a href="https://vk.com/artedeli" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-ad-cream/60 hover:text-ad-cream text-sm transition-colors font-body">
              <span className="text-ad-orange font-bold">VK</span> vk.com/artedeli
            </a>
          </div>

          <div>
            <div className="font-display font-bold text-ad-cream mb-4 text-sm uppercase tracking-wider">Меню</div>
            <ul className="space-y-2">
              {["Все пиццы", "Акции", "Доставка", "Контакты"].map(l => (
                <li key={l}><a href="#" className="text-ad-cream/50 hover:text-ad-cream text-sm font-body transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-display font-bold text-ad-cream mb-4 text-sm uppercase tracking-wider">О нас</div>
            <ul className="space-y-2">
              {["История ARTE DELI", "Отзывы", "FAQ"].map(l => (
                <li key={l}><a href="#" className="text-ad-cream/50 hover:text-ad-cream text-sm font-body transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-display font-bold text-ad-cream mb-4 text-sm uppercase tracking-wider">Контакты</div>
            <div className="space-y-3">
              <a href="tel:+79951380331" className="flex items-center gap-2 text-ad-cream/60 hover:text-ad-cream text-sm transition-colors font-body">
                <Icon name="Phone" size={14} className="text-ad-orange" /> +7 (995) 138-03-31
              </a>
              <a href="mailto:food@artedeli.ru" className="flex items-center gap-2 text-ad-cream/60 hover:text-ad-cream text-sm transition-colors font-body">
                <Icon name="Mail" size={14} className="text-ad-orange" /> food@artedeli.ru
              </a>
              <div className="flex items-center gap-2 text-ad-cream/60 text-sm font-body">
                <Icon name="MapPin" size={14} className="text-ad-orange" /> ул. Калинина, 3, Белгород
              </div>
              <div className="flex items-center gap-2 text-ad-cream/60 text-sm font-body">
                <Icon name="Clock" size={14} className="text-ad-orange" /> 10:00 – 22:00 ежедневно
              </div>
            </div>
          </div>
        </div>

        <div className="section-divider mb-8" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-ad-cream/30 text-xs font-body">
          <span>© 2024 ARTE DELI. Все права защищены.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-ad-cream/60 transition-colors">Политика конфиденциальности</a>
            <a href="#" className="hover:text-ad-cream/60 transition-colors">Условия доставки</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ==================== TOAST ==================== */

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] toast-ad px-5 py-3.5 flex items-center gap-3 animate-fade-in-up">
      <span className="text-xl">🍕</span>
      <span className="font-display font-semibold text-ad-cream text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 text-ad-cream/40 hover:text-ad-cream/70">
        <Icon name="X" size={14} />
      </button>
    </div>
  );
}

/* ==================== MAIN PAGE ==================== */

export default function Index() {
  const { settings } = useSiteSettings();
  const [cart, setCart] = useState<{ id: number; qty: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedPizza, setSelectedPizza] = useState<typeof PIZZAS[0] | null>(null);

  // Overlays
  const [showAuth, setShowAuth] = useState(false);
  const [showCabinet, setShowCabinet] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null);

  // Load products from backend on mount
  const [pizzas, setPizzas] = useState(PIZZAS);
  useEffect(() => {
    productsApi.list().then(res => {
      if (res.products && res.products.length > 0) {
        const mapped = res.products.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          tags: p.tags || [],
          emoji: p.emoji || "🍕",
          desc: p.description || "",
          composition: p.composition || "",
          size: p.size || "32 см",
        }));
        setPizzas(mapped);
      }
    }).catch(() => {/* use local fallback */});
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = (id: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) return prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id, qty: 1 }];
    });
    const pizza = pizzas.find(p => p.id === id);
    if (pizza) setToast(`${pizza.name} добавлена в корзину`);
  };

  const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.id !== id));
  const changeQty = (id: number, delta: number) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));

  // Cart items with product data
  const cartItems = cart.map(ci => {
    const p = pizzas.find(x => x.id === ci.id);
    return p ? { id: p.id, name: p.name, emoji: p.emoji, price: p.price, qty: ci.qty } : null;
  }).filter(Boolean) as { id: number; name: string; emoji: string; price: number; qty: number }[];

  // If checkout is open, show it full-screen
  if (showCheckout) {
    return (
      <Checkout
        cart={cartItems}
        onBack={() => setShowCheckout(false)}
        onSuccess={(orderId) => {
          setCart([]);
          setShowCheckout(false);
          setSuccessOrderId(orderId);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen font-body" style={{ background: "linear-gradient(180deg, #03270D 0%, #03280E 60%, #101510 100%)" }}>
      <Header
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
        onAuthClick={() => setShowAuth(true)}
        onCabinetClick={() => setShowCabinet(true)}
        onAdminClick={() => setShowAdmin(true)}
        phone={settings.phone}
        vkUrl={settings.vk_url}
      />
      <Hero
        onOrder={() => { document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }); }}
        settings={settings}
      />

      <div className="section-divider" />
      <Stories />
      <div className="section-divider" />
      <MenuSection onAdd={addToCart} onOpenDetail={setSelectedPizza} />
      <div className="section-divider" />
      <PromoSection />
      <div className="section-divider" />
      <MoodPizzaSection onAdd={addToCart} onOpenDetail={setSelectedPizza} />
      <div className="section-divider" />
      <DeliverySection />
      <div className="section-divider" />
      <ReviewsSection />
      <Footer />

      {/* Product detail modal */}
      {selectedPizza && (
        <ProductModal
          pizza={selectedPizza as Parameters<typeof ProductModal>[0]["pizza"]}
          onClose={() => setSelectedPizza(null)}
          onAdd={(id) => { addToCart(id); setSelectedPizza(null); }}
        />
      )}

      {/* Cart panel */}
      {cartOpen && (
        <CartPanel
          items={cart}
          onClose={() => setCartOpen(false)}
          onRemove={removeFromCart}
          onQtyChange={changeQty}
          onCheckout={() => {
            setCartOpen(false);
            setShowCheckout(true);
          }}
        />
      )}

      {/* Order tracker */}
      {successOrderId !== null && (
        <OrderTracker
          orderId={successOrderId}
          onClose={() => setSuccessOrderId(null)}
        />
      )}

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Cabinet */}
      {showCabinet && (
        <Cabinet
          onClose={() => setShowCabinet(false)}
          onOrderAgain={(items) => {
            items.forEach(item => {
              setCart(prev => {
                const ex = prev.find(i => i.id === item.id);
                if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i);
                return [...prev, { id: item.id, qty: item.qty }];
              });
            });
            setToast("Заказ добавлен в корзину");
          }}
        />
      )}

      {/* Admin */}
      {showAdmin && <Admin onClose={() => setShowAdmin(false)} />}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}