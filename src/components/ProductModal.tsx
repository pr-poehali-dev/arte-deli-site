import { createPortal } from "react-dom";
import { Product } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Props {
  pizza: Product & { emoji: string; desc?: string; composition?: string };
  onClose: () => void;
  onAdd: (id: number) => void;
}

export default function ProductModal({ pizza, onClose, onAdd }: Props) {
  const tagLabel = (t: string) => {
    if (t === "hot") return "🔥 Острая";
    if (t === "new") return "✨ Новинка";
    if (t === "popular" || t === "hit") return "⭐ Хит";
    if (t === "classic") return "👑 Классика";
    return t;
  };
  const tagClass = (t: string) => {
    if (t === "hot") return "tag-hot";
    if (t === "new") return "tag-new";
    return "tag-popular";
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[300] modal-overlay flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-[#0d2010] to-[#071507] rounded-t-3xl sm:rounded-3xl border border-ad-orange/10 animate-fade-in-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {(pizza.tags || []).map(t => (
                <span key={t} className={tagClass(t)}>{tagLabel(t)}</span>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
            >
              <Icon name="X" size={16} className="text-ad-cream/60" />
            </button>
          </div>

          {/* Image / emoji */}
          <div className="text-center">
            {pizza.image_url ? (
              <img src={pizza.image_url} alt={pizza.name}
                className="w-36 h-36 object-cover rounded-3xl mx-auto shadow-xl"
                style={{ boxShadow: "0 0 40px rgba(255,122,0,0.2)" }}
              />
            ) : (
              <div className="text-8xl mb-2 select-none">{pizza.emoji}</div>
            )}
            <h2 className="font-display font-black text-2xl text-ad-cream mt-3">{pizza.name}</h2>
            <p className="text-ad-cream/60 text-sm mt-2 font-body leading-relaxed px-2">
              {pizza.description || pizza.desc}
            </p>
          </div>

          {/* Info */}
          <div className="bg-white/3 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Icon name="Ruler" size={14} className="text-ad-gold" />
              <span className="text-ad-cream/60 font-body">Размер:</span>
              <span className="text-ad-cream font-semibold">{pizza.size || "32 см"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Icon name="Layers" size={14} className="text-ad-gold" />
              <span className="text-ad-cream/60 font-body">Тесто:</span>
              <span className="text-ad-cream font-semibold">Тонкое</span>
            </div>
          </div>

          {/* Состав */}
          {(pizza.composition) && (
            <div>
              <div className="text-xs font-bold text-ad-gold font-display mb-2 uppercase tracking-wider">Состав</div>
              <p className="text-ad-cream/65 text-sm font-body leading-relaxed">{pizza.composition}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-display font-black text-3xl text-ad-cream">{pizza.price} ₽</span>
            <button
              onClick={() => { onAdd(pizza.id); onClose(); }}
              className="btn-primary px-8 py-3 text-base"
            >
              В корзину
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
