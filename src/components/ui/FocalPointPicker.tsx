import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FocalPointPickerProps {
  imageUrl: string;
  focalX: number; // 0-100
  focalY: number; // 0-100
  onChange: (x: number, y: number) => void;
  className?: string;
}

type AspectPreset = "wide" | "square" | "classic";

const ASPECT: Record<AspectPreset, number> = {
  wide: 16 / 9,
  square: 1,
  classic: 4 / 3,
};

const PRESET_LABELS: Record<AspectPreset, string> = {
  wide: "16:9",
  square: "1:1",
  classic: "4:3",
};

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

/**
 * FocalPointPicker
 * Allows clicking/dragging on an image to set a focal point (x%, y%).
 * The focal point is used as CSS object-position so the subject stays
 * visible regardless of how the image is cropped.
 */
export function FocalPointPicker({
  imageUrl,
  focalX,
  focalY,
  onChange,
  className,
}: FocalPointPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [preset, setPreset] = useState<AspectPreset>("wide");
  const [loaded, setLoaded] = useState(false);

  const calcFocal = useCallback(
    (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      let clientX: number;
      let clientY: number;

      if ("touches" in e) {
        const touch = (e as TouchEvent).touches[0] ?? (e as TouchEvent).changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const x = clamp(((clientX - rect.left) / rect.width) * 100);
      const y = clamp(((clientY - rect.top) / rect.height) * 100);
      onChange(Math.round(x), Math.round(y));
    },
    [onChange]
  );

  // Global mouse/touch move & up handlers for drag support
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) calcFocal(e);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging.current) {
        e.preventDefault();
        calcFocal(e);
      }
    };
    const onTouchEnd = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [calcFocal]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    calcFocal(e);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    calcFocal(e);
  };

  const aspectRatio = ASPECT[preset];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Preset toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">
          Punct de focus (clic sau trage):
        </span>
        <div className="flex gap-1 ml-auto">
          {(Object.keys(ASPECT) as AspectPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className={cn(
                "px-2 py-0.5 text-xs rounded border transition-colors",
                preset === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Two-panel layout: picker left, previews right */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ── Left: focal point picker ── */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Imaginea originală — dă clic pentru focus</p>
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-md border border-dashed border-primary/40 cursor-crosshair select-none bg-muted"
            style={{ aspectRatio: "3/2" }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="focal picker"
                draggable={false}
                className="h-full w-full object-cover pointer-events-none"
                style={{ objectPosition: "50% 50%" }}
                onLoad={() => setLoaded(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Fără imagine
              </div>
            )}

            {/* Crosshair marker */}
            {loaded && imageUrl && (
              <>
                {/* Horizontal line */}
                <div
                  className="absolute inset-x-0 h-px bg-white/70 pointer-events-none"
                  style={{ top: `${focalY}%` }}
                />
                {/* Vertical line */}
                <div
                  className="absolute inset-y-0 w-px bg-white/70 pointer-events-none"
                  style={{ left: `${focalX}%` }}
                />
                {/* Dot */}
                <div
                  className="absolute w-5 h-5 rounded-full border-2 border-white bg-primary/80 shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${focalX}%`, top: `${focalY}%` }}
                />
              </>
            )}

            {/* Instruction overlay (shown before image loads) */}
            {!loaded && imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
                <span className="text-xs text-muted-foreground">Se încarcă...</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            Focus: {focalX}% × {focalY}%
          </p>
        </div>

        {/* ── Right: live previews ── */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Preview cu focus aplicat</p>
          <div className="space-y-2">
            {(Object.keys(ASPECT) as AspectPreset[]).map((p) => (
              <div key={p} className="flex items-center gap-2">
                <span className="text-[10px] w-8 text-muted-foreground shrink-0">
                  {PRESET_LABELS[p]}
                </span>
                <div
                  className={cn(
                    "overflow-hidden rounded border bg-muted flex-1",
                    p === preset && "ring-2 ring-primary"
                  )}
                  style={{ aspectRatio: String(ASPECT[p]) }}
                >
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={`preview ${p}`}
                      draggable={false}
                      className="h-full w-full object-cover pointer-events-none"
                      style={{ objectPosition: `${focalX}% ${focalY}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
