import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Story } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Props {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

export default function StoriesViewer({ stories, initialIndex, onClose }: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  const current = stories[idx];

  const goNext = useCallback(() => {
    if (idx < stories.length - 1) {
      setIdx(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [idx, stories.length, onClose]);

  const goPrev = () => {
    if (idx > 0) {
      setIdx(i => i - 1);
      setProgress(0);
    }
  };

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          goNext();
          return 100;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden animate-scale-in shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Background */}
        {current.image_url ? (
          <img src={current.image_url} alt={current.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${current.bg || "from-ad-orange to-ad-gold"}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 p-3 flex gap-1.5 z-10">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
                  transition: i === idx ? "width 0.1s linear" : "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-8 right-4 z-10 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
        >
          <Icon name="X" size={16} className="text-white" />
        </button>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 z-10">
          <div className="text-7xl">{current.emoji}</div>
          <div className="text-white text-2xl font-black font-display text-center">{current.title}</div>
          {current.content && (
            <p className="text-white/80 text-center font-body text-sm leading-relaxed">{current.content}</p>
          )}
        </div>

        {/* Button */}
        {current.button_text && (
          <div className="absolute bottom-6 left-6 right-6 z-10">
            {current.button_link ? (
              <a
                href={current.button_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full py-4 text-base text-center block"
              >
                {current.button_text}
              </a>
            ) : (
              <button className="btn-primary w-full py-4 text-base" onClick={onClose}>
                {current.button_text}
              </button>
            )}
          </div>
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 flex z-20 pointer-events-none">
          <div className="flex-1 pointer-events-auto cursor-pointer" onClick={goPrev} />
          <div className="flex-1 pointer-events-auto cursor-pointer" onClick={goNext} />
        </div>
      </div>
    </div>,
    document.body
  );
}
