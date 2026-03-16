import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, MessageSquare, ShieldCheck } from "lucide-react";

interface AvailabilityInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  experienceTitle: string;
}

export function AvailabilityInfoModal({
  isOpen,
  onClose,
  onConfirm,
  experienceTitle,
}: AvailabilityInfoModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="w-5 h-5 text-primary" />
            Verificare Disponibilitate
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-4 space-y-4">
            <p>
              Pentru experiența <strong>{experienceTitle}</strong>, disponibilitatea este confirmată manual de către furnizor.
            </p>
            
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg border border-border">
              <div className="flex gap-3">
                <MessageSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>SMS Automat:</strong> Vom trimite imediat o cerere furnizorului.
                </div>
              </div>
              
              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Răspuns în 15 min:</strong> Vei primi un SMS de confirmare în maximum 15 minute.
                </div>
              </div>
              
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Rezervare Garantată:</strong> Odată confirmat, slotul va fi blocat special pentru tine timp de 15 minute pentru a finaliza plata.
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Dacă ești de acord, apasă pe butonul de mai jos pentru a iniția verificarea.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Anulează</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary hover:bg-primary/90">
            Verifică Disponibilitatea
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
