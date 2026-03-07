import { useCallback } from "react";

export const useExportCSV = () => {
  return useCallback((data: Record<string, any>[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? "").replace(/"/g, '""');
          return `"${val}"`;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);
};

export const useExportPDF = () => {
  return useCallback(async (data: Record<string, any>[], filename: string, title: string) => {
    if (!data.length) return;
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => String(row[h] ?? "")));

    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 34,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 150, 255], textColor: 255, fontSize: 8 },
    });

    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }, []);
};
