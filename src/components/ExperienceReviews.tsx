import { useState } from "react";
import { format } from "date-fns";
import { useExperienceReviews, useAddReview } from "@/hooks/useReviews";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ExperienceReviews({ experienceId }: { experienceId: string }) {
  const { data: reviews, isLoading } = useExperienceReviews(experienceId);
  const { mutate: addReview, isPending } = useAddReview();
  const { user } = useAuth();
  
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState<number>(0);

  const hasReviewed = reviews?.some((r: any) => user && r.user_id === user.id);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    addReview({ experienceId, rating, comment }, {
      onSuccess: () => {
        setRating(0);
        setComment("");
      }
    });
  };

  if (isLoading) return null;

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <h3 className="text-2xl font-bold text-foreground mb-8">
        Recenzii ({reviews?.length || 0})
      </h3>
      
      {user ? (
        !hasReviewed ? (
          <form onSubmit={handleSubmit} className="mb-10 bg-muted/20 p-6 rounded-2xl border border-border">
            <h4 className="font-semibold mb-4">Adaugă o recenzie</h4>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="text-2xl transition-colors"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <span className={star <= (hoverRating || rating) ? "text-amber-500" : "text-muted-foreground/30"}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            <Textarea 
              placeholder="Cum a fost experiența ta?" 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mb-4 bg-background"
              rows={3}
            />
            <Button type="submit" disabled={rating === 0 || isPending}>
              {isPending ? "Se adaugă..." : "Trimite recenzia"}
            </Button>
          </form>
        ) : (
          <div className="mb-10 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm text-foreground">
            Ai lăsat deja o recenzie pentru această experiență. Îți mulțumim!
          </div>
        )
      ) : (
        <div className="mb-10 p-4 bg-muted/30 rounded-xl text-center text-sm text-muted-foreground">
          Trebuie să fii autentificat pentru a lăsa o recenzie.
        </div>
      )}

      {(!reviews || reviews.length === 0) ? (
        <p className="text-muted-foreground">Nu există recenzii încă. Fii primul care adaugă una!</p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review: any) => (
            <div key={review.id} className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                  {review.user_avatar ? (
                    <img src={review.user_avatar} alt={review.user_name} className="w-full h-full object-cover" />
                  ) : (
                    review.user_name ? review.user_name.charAt(0).toUpperCase() : 'A'
                  )}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {review.user_name || "Anonim"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-sm tracking-widest">
                      {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {format(new Date(review.created_at), "dd.MM.yyyy")}
                    </span>
                  </div>
                </div>
              </div>
              {review.comment && (
                <p className="text-foreground/90 leading-relaxed text-sm">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
