import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExportCSV, useExportPDF } from "@/hooks/useExport";

interface Props {
  data: Record<string, any>[];
  filename: string;
  title: string;
}

const ExportButtons = ({ data, filename, title }: Props) => {
  const exportCSV = useExportCSV();
  const exportPDF = useExportPDF();

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => exportCSV(data, filename)}
        className="h-8 text-xs gap-1.5 border-border text-muted-foreground hover:text-foreground"
        disabled={!data.length}>
        <Download className="w-3 h-3" /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportPDF(data, filename, title)}
        className="h-8 text-xs gap-1.5 border-border text-muted-foreground hover:text-foreground"
        disabled={!data.length}>
        <FileText className="w-3 h-3" /> PDF
      </Button>
    </div>
  );
};

export default ExportButtons;
