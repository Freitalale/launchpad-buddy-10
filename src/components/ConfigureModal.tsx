// Placeholder modals - simplified versions
import { type Plataforma } from "@/hooks/usePlatforms";

interface ConfigureModalProps {
  platform: Plataforma | null;
  onClose: () => void;
}

const ConfigureModal = ({ platform, onClose }: ConfigureModalProps) => {
  if (!platform) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border p-6 space-y-4" style={{ background: "hsl(var(--card))" }}>
        <h2 className="font-bold text-lg text-foreground">Configurar — {platform.nome}</h2>
        <p className="text-sm text-muted-foreground">Configurações de banco de dados, webhooks e gateway disponíveis em breve.</p>
        <button onClick={onClose} className="text-sm text-primary hover:underline">Fechar</button>
      </div>
    </div>
  );
};

export default ConfigureModal;
