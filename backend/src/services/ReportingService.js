import prisma from "../config/db.js";
import { Parser } from "@json2csv/plainjs";

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

  async exportTransactionsCSV(userId) {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const data = transactions.map((t) => ({
      Date: t.date.toISOString().split("T")[0],
      Amount: t.amount,
      Category: t.category.name,
      Type: t.category.type,
      Description: t.description,
      Currency: t.currency,
    }));

    const opts = {};
    const parser = new Parser(opts);
    const csv = parser.parse(data);

    return csv;
  }
}
