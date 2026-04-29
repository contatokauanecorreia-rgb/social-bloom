import { Hand, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CarouselModeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickManual: () => void;
  onPickAI: () => void;
};

export function CarouselModeDialog({ open, onOpenChange, onPickManual, onPickAI }: CarouselModeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Como você quer criar?</DialogTitle>
          <DialogDescription>
            Escolha começar do zero ou deixar a IA preparar tudo a partir do DNA da marca.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeButton
            icon={<Hand className="h-5 w-5" />}
            title="Criar manualmente"
            description="Abre o editor em branco para você montar slide a slide."
            onClick={onPickManual}
          />
          <ModeButton
            icon={<Sparkles className="h-5 w-5" />}
            title="Criar com IA"
            description="A IA escreve os slides e pode gerar imagens com Nano Banana Pro."
            onClick={onPickAI}
            highlighted
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  icon,
  title,
  description,
  onClick,
  highlighted,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-full flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md",
        highlighted ? "border-primary/40 bg-primary/5 hover:border-primary" : "hover:border-primary/40",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          highlighted ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
