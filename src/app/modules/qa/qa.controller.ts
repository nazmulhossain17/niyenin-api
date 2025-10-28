import { Request, Response } from "express";
import { db } from "../../db";
import { productAnswers, productQuestions, products } from "../../db/schema";
import { eq } from "drizzle-orm";
import { CreateAnswerInput, CreateQuestionInput } from "./qa.validation";

export class QAController {
  // Create question
  static async createQuestion(req: Request, res: Response) {
    try {
      const questionData: CreateQuestionInput = req.body;

      // Check if product exists
      const product = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, questionData.productId))
        .limit(1);

      if (!product.length) {
        // return sendError(res, "Product not found", 404);
        return res.status(404).json({ error: "Product not found" });
      }

      const newQuestion = await db
        .insert(productQuestions)
        .values(questionData)
        .returning({
          id: productQuestions.id,
          productId: productQuestions.productId,
          userId: productQuestions.userId,
          question: productQuestions.question,
          createdAt: productQuestions.createdAt,
        });

      return res.status(201).json({
        success: true,
        data: newQuestion[0],
        message: "Question created successfully",
      });
    } catch (error) {
      console.error("Create question error:", error);
      return res.status(500).json({ error: "Failed to create question" });
    }
  }

  // Create answer
  static async createAnswer(req: Request, res: Response) {
    try {
      const answerData: CreateAnswerInput = req.body;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Check if question exists
      const question = await db
        .select({ id: productQuestions.id })
        .from(productQuestions)
        .where(eq(productQuestions.id, answerData.questionId))
        .limit(1);

      if (!question.length) {
        return sendError(res, "Question not found", 404);
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const vendor = await db
          .select({ userId: vendors.userId })
          .from(vendors)
          .where(eq(vendors.id, answerData.vendorId))
          .limit(1);

        if (!vendor.length || vendor[0].userId !== currentUserId) {
          return sendError(res, "Not authorized to answer as this vendor", 403);
        }
      }

      // Check if answer already exists for this question from this vendor
      const existingAnswer = await db
        .select({ id: productAnswers.id })
        .from(productAnswers)
        .where(eq(productAnswers.questionId, answerData.questionId))
        .limit(1);

      if (existingAnswer.length > 0) {
        return sendError(res, "Answer already exists for this question", 409);
      }

      const newAnswer = await db
        .insert(productAnswers)
        .values(answerData)
        .returning({
          id: productAnswers.id,
          questionId: productAnswers.questionId,
          vendorId: productAnswers.vendorId,
          answer: productAnswers.answer,
          createdAt: productAnswers.createdAt,
        });

      return sendSuccess(res, newAnswer[0], "Answer created successfully", 201);
    } catch (error) {
      console.error("Create answer error:", error);
      return sendError(res, "Failed to create answer", 500);
    }
  }

  // Get questions and answers by product ID
  static async getQAByProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;

      // Get questions with their answers
      const questions = await db
        .select({
          id: productQuestions.id,
          productId: productQuestions.productId,
          userId: productQuestions.userId,
          question: productQuestions.question,
          createdAt: productQuestions.createdAt,
          userName: users.name,
        })
        .from(productQuestions)
        .innerJoin(users, eq(productQuestions.userId, users.id))
        .where(eq(productQuestions.productId, Number(productId)))
        .orderBy(desc(productQuestions.createdAt));

      // Get answers for each question
      const questionsWithAnswers = await Promise.all(
        questions.map(async (question) => {
          const answers = await db
            .select({
              id: productAnswers.id,
              questionId: productAnswers.questionId,
              vendorId: productAnswers.vendorId,
              answer: productAnswers.answer,
              createdAt: productAnswers.createdAt,
              vendorName: vendors.shopName,
            })
            .from(productAnswers)
            .innerJoin(vendors, eq(productAnswers.vendorId, vendors.id))
            .where(eq(productAnswers.questionId, question.id))
            .orderBy(desc(productAnswers.createdAt));

          return {
            ...question,
            answers,
          };
        })
      );

      return sendSuccess(
        res,
        questionsWithAnswers,
        "Q&A retrieved successfully"
      );
    } catch (error) {
      console.error("Get Q&A by product error:", error);
      return sendError(res, "Failed to retrieve Q&A", 500);
    }
  }

  // Get question by ID
  static async getQuestionById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const question = await db
        .select({
          id: productQuestions.id,
          productId: productQuestions.productId,
          userId: productQuestions.userId,
          question: productQuestions.question,
          createdAt: productQuestions.createdAt,
          userName: users.name,
        })
        .from(productQuestions)
        .innerJoin(users, eq(productQuestions.userId, users.id))
        .where(eq(productQuestions.id, Number(id)))
        .limit(1);

      if (!question.length) {
        return sendError(res, "Question not found", 404);
      }

      // Get answers for this question
      const answers = await db
        .select({
          id: productAnswers.id,
          questionId: productAnswers.questionId,
          vendorId: productAnswers.vendorId,
          answer: productAnswers.answer,
          createdAt: productAnswers.createdAt,
          vendorName: vendors.shopName,
        })
        .from(productAnswers)
        .innerJoin(vendors, eq(productAnswers.vendorId, vendors.id))
        .where(eq(productAnswers.questionId, Number(id)))
        .orderBy(desc(productAnswers.createdAt));

      const questionWithAnswers = {
        ...question[0],
        answers,
      };

      return sendSuccess(
        res,
        questionWithAnswers,
        "Question retrieved successfully"
      );
    } catch (error) {
      console.error("Get question by ID error:", error);
      return sendError(res, "Failed to retrieve question", 500);
    }
  }

  // Update answer
  static async updateAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateAnswerInput = req.body;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Get answer and check ownership
      const answer = await db
        .select({
          id: productAnswers.id,
          vendorId: productAnswers.vendorId,
        })
        .from(productAnswers)
        .where(eq(productAnswers.id, Number(id)))
        .limit(1);

      if (!answer.length) {
        return sendError(res, "Answer not found", 404);
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const vendor = await db
          .select({ userId: vendors.userId })
          .from(vendors)
          .where(eq(vendors.id, answer[0].vendorId))
          .limit(1);

        if (!vendor.length || vendor[0].userId !== currentUserId) {
          return sendError(res, "Not authorized to update this answer", 403);
        }
      }

      const updatedAnswer = await db
        .update(productAnswers)
        .set(updateData)
        .where(eq(productAnswers.id, Number(id)))
        .returning({
          id: productAnswers.id,
          questionId: productAnswers.questionId,
          vendorId: productAnswers.vendorId,
          answer: productAnswers.answer,
          createdAt: productAnswers.createdAt,
        });

      if (!updatedAnswer.length) {
        return sendError(res, "Answer not found", 404);
      }

      return sendSuccess(res, updatedAnswer[0], "Answer updated successfully");
    } catch (error) {
      console.error("Update answer error:", error);
      return sendError(res, "Failed to update answer", 500);
    }
  }

  // Delete question (admin only)
  static async deleteQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Delete associated answers first
      await db
        .delete(productAnswers)
        .where(eq(productAnswers.questionId, Number(id)));

      // Delete question
      const deletedQuestion = await db
        .delete(productQuestions)
        .where(eq(productQuestions.id, Number(id)))
        .returning({ id: productQuestions.id });

      if (!deletedQuestion.length) {
        return sendError(res, "Question not found", 404);
      }

      return sendSuccess(res, null, "Question deleted successfully");
    } catch (error) {
      console.error("Delete question error:", error);
      return sendError(res, "Failed to delete question", 500);
    }
  }

  // Delete answer
  static async deleteAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Get answer and check ownership
      const answer = await db
        .select({
          id: productAnswers.id,
          vendorId: productAnswers.vendorId,
        })
        .from(productAnswers)
        .where(eq(productAnswers.id, Number(id)))
        .limit(1);

      if (!answer.length) {
        return sendError(res, "Answer not found", 404);
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const vendor = await db
          .select({ userId: vendors.userId })
          .from(vendors)
          .where(eq(vendors.id, answer[0].vendorId))
          .limit(1);

        if (!vendor.length || vendor[0].userId !== currentUserId) {
          return sendError(res, "Not authorized to delete this answer", 403);
        }
      }

      const deletedAnswer = await db
        .delete(productAnswers)
        .where(eq(productAnswers.id, Number(id)))
        .returning({ id: productAnswers.id });

      if (!deletedAnswer.length) {
        return sendError(res, "Answer not found", 404);
      }

      return sendSuccess(res, null, "Answer deleted successfully");
    } catch (error) {
      console.error("Delete answer error:", error);
      return sendError(res, "Failed to delete answer", 500);
    }
  }
}
