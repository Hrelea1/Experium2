import { cn } from "@/lib/utils";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  focalX?: number | null;
  focalY?: number | null;
  className?: string;
  imgClassName?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Fallback images for different types of failures
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1549417229-aa67d3263c09?w=1200&h=800&fit=crop";

export function ExperienceImage({
  src,
  alt,
  focalX,
  focalY,
  className,
  imgClassName,
}: Props) {
  const [hasError, setHasError] = useState(false);
  
  // Normalize incorrect domain prefixes from previous uploads
  let finalSrc = src;
  if (src?.startsWith("https://experium.ro/static/")) {
    finalSrc = src.replace("https://experium.ro/static/", "https://experium2-production.up.railway.app/static/");
  }
  
  const x = clamp(typeof focalX === "number" ? focalX : 50, 0, 100);
  const y = clamp(typeof focalY === "number" ? focalY : 50, 0, 100);

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <img
        src={hasError ? FALLBACK_IMAGE : (finalSrc || FALLBACK_IMAGE)}
        alt={alt}
        className={cn("h-full w-full object-cover transition-opacity duration-300", 
          imgClassName,
          hasError ? "opacity-70 grayscale-[0.5]" : "opacity-100"
        )}
        style={{ objectPosition: `${x}% ${y}%` }}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
