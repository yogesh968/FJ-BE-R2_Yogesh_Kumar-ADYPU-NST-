import { ReportingService } from "../services/ReportingService.js";
import { ApiResponse } from "../utils/ApiHandler.js";

const reportingService = new ReportingService();

export class ReportingController {
    async getMonthlyReport(req, res, next) {
        try {
            const month = parseInt(req.query.month);
            const year = parseInt(req.query.year);
            if (isNaN(month) || isNaN(year)) {
                res.status(400).json(new ApiResponse(400, null, "Month and year are required"));
                return;
            }
            const result = await reportingService.getMonthlyReport(req.user.id, month, year);
            res.status(200).json(new ApiResponse(200, result, "Monthly report fetched successfully"));
        } catch (error) {
            next(error);
        }
    }

    async exportCSV(req, res, next) {
        try {
            const month = parseInt(req.query.month);
            const year = parseInt(req.query.year);
            const csv = await reportingService.exportTransactionsCSV(req.user.id, month, year);
            res.header("Content-Type", "text/csv");
            res.attachment(`transactions_${month || 'all'}_${year || ''}.csv`);
            res.send(csv);
        } catch (error) {
            next(error);
        }
    }

    async exportPDF(req, res, next) {
        try {
            const month = parseInt(req.query.month);
            const year = parseInt(req.query.year);
            const pdfBuffer = await reportingService.exportTransactionsPDF(req.user.id, month, year);
            res.header("Content-Type", "application/pdf");
            res.attachment(`statement_${month || 'all'}_${year || ''}.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    }
}
