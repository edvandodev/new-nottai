import { jsPDF } from "jspdf";
import { Sale } from "../types";

export const generateReceipt = (
  clientName: string,
  amount: number,
  salesPaid: Sale[],
  paymentDate: string
) => {
  const doc = new jsPDF();

  // Configs
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Helper function to format currency
  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // --- HEADER ---
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Comprovante de Pagamento", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Nottai", pageWidth / 2, 30, { align: "center" });

  yPos = 55;

  // --- INFO DO CLIENTE ---
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Cliente: ${clientName}`, margin, yPos);
  
  yPos += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Data do Pagamento: ${new Date(paymentDate).toLocaleDateString("pt-BR")} às ${new Date(paymentDate).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}`,
    margin,
    yPos
  );

  yPos += 15;

  // --- TABELA DE ITENS (Resumo) ---
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos); // Top line
  yPos += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Descrição / Data da Compra", margin, yPos);
  doc.text("Valor", pageWidth - margin, yPos, { align: "right" });
  
  yPos += 4;
  doc.line(margin, yPos, pageWidth - margin, yPos); // Header bottom line
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  // Listar as compras que compõem este pagamento
  // Se houver muitas, vamos agrupar ou limitar para caber em 1 pág simples
  salesPaid.forEach((sale) => {
    const dateStr = new Date(sale.date + 'T12:00:00').toLocaleDateString("pt-BR");
    const itemDesc = `Leite (${sale.liters}L) - ${dateStr}`;
    const itemValue = formatBRL(sale.totalValue);

    doc.text(itemDesc, margin, yPos);
    doc.text(itemValue, pageWidth - margin, yPos, { align: "right" });
    yPos += 7;
  });

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos); // Bottom line

  // --- TOTAL ---
  yPos += 12;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74); // Green 600
  doc.text(`TOTAL PAGO: ${formatBRL(amount)}`, pageWidth - margin, yPos, {
    align: "right",
  });

  // --- FOOTER ---
  yPos += 30;
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  doc.text("Gerado por Nottai", pageWidth / 2, yPos, { align: "center" });

  // Nome do arquivo
  const fileName = `Comprovante_${clientName.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`;

  // Salvar (Download)
  doc.save(fileName);
};