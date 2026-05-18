import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function exportPDF(titulo: string, headers: string[], rows: (string | number)[][], filename: string) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("NOVAMIX", 14, 16);
  doc.setFontSize(12);
  doc.text(titulo, 14, 24);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("es-MX"), 14, 30);
  autoTable(doc, {
    startY: 36,
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [220, 38, 38] },
  });
  doc.save(`${filename}.pdf`);
}

export function exportExcel(sheetName: string, headers: string[], rows: (string | number)[][], filename: string) {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}