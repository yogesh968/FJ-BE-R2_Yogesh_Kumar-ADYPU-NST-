import prisma from "../config/db.js";
import { Parser } from "@json2csv/plainjs";
import PDFDocument from "pdfkit-table";

export class ReportingService {
  async getMonthlyReport(userId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const report = await prisma.transaction.groupBy({
      by: ['currency', 'categoryId'],
      where: {
        userId,
        date: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });

    // Augment with category names
    const categories = await prisma.category.findMany();
    const result = report.map(r => ({
      ...r,
      category: categories.find(c => c.id === r.categoryId)?.name || 'Unknown',
      type: categories.find(c => c.id === r.categoryId)?.type,
      total: r._sum.amount
    }));

    return result;
  }

  async exportTransactionsCSV(userId, month, year) {
    const where = { userId };
    if (month && year) {
      where.date = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0)
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const data = transactions.map((t) => ({
      Date: t.date.toISOString().split("T")[0],
      Amount: t.amount,
      Category: t.category.name,
      Type: t.category.type,
      Description: t.description || "",
      Currency: t.currency,
    }));

    const parser = new Parser();
    return parser.parse(data);
  }

  async exportTransactionsPDF(userId, month, year) {
    const where = { userId };
    if (month && year) {
      where.date = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0)
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(20).text("Financial Statement", { align: 'center' });
      doc.fontSize(10).text(`Generated for User ID: ${userId}`, { align: 'center' });
      if (month && year) {
        doc.text(`Period: ${month}/${year}`, { align: 'center' });
      }
      doc.moveDown(2);

      const tableData = {
        headers: ["Date", "Category", "Description", "Type", "Amount"],
        rows: transactions.map(t => [
          t.date.toISOString().split("T")[0],
          t.category.name,
          t.description || "N/A",
          t.category.type,
          `${t.amount} ${t.currency}`
        ])
      };

      doc.table(tableData, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
          doc.font("Helvetica").fontSize(9);
          return doc;
        },
      });

      doc.end();
    });
  }
}
