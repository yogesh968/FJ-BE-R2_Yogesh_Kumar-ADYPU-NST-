import { AIService } from "../services/AIService.js";
import { ApiResponse } from "../utils/ApiHandler.js";

const aiService = new AIService();

export class AIController {
    async chat(req, res, next) {
        try {
            const { message } = req.body;
            if (!message) {
                return res.status(400).json(new ApiResponse(400, null, "Message will be required."));
            }

            const response = await aiService.getChatResponse(req.user.id, message);
            res.status(200).json(new ApiResponse(200, { response }, "AI response fetched successfully"));
        } catch (error) {
            next(error);
        }
    }
}
