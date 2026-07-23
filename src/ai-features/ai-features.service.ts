import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { ChatQueryDto } from './dto/chat-query.dto';
import { InjectModel } from '@nestjs/mongoose';
import { AIChatHistory, AIChatHistoryDocument } from './schema/ai-chat-history';
import { Model } from 'mongoose';
import { getSystemPrompt } from './system-prompts';

@Injectable()
export class AiFeaturesService {
  private groq: Groq;

  constructor(
    private configService: ConfigService,
    @InjectModel(AIChatHistory.name) private aiChatHistoryModel: Model<AIChatHistoryDocument>
  ) {

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not defined in the environment variables.');
    }
    this.groq = new Groq({
      apiKey,
    });
  }

  async handleChatQuery(chatQueryDto: ChatQueryDto, user?: any) {
    try {

      const { query } = chatQueryDto;

      const systemInstruction = getSystemPrompt(user);

      let messages: any[] = [];
      messages.push({ role: 'system', content: systemInstruction });

      let dbHistoryDoc: AIChatHistoryDocument | null = null;

      // Handle DB History
      if (user && user._id) {
        dbHistoryDoc = await this.aiChatHistoryModel.findOne({ user: user._id }).sort({ createdAt: -1 });
        if (!dbHistoryDoc) {
          dbHistoryDoc = new this.aiChatHistoryModel({ user: user._id, history: [] });
        }

        // Add DB history to messages
        dbHistoryDoc.history.slice(-10).forEach(entry => {
          messages.push({
            role: entry.role === 'model' ? 'assistant' : 'user',
            content: entry.parts.map(p => p.text).join('\n'),
          });
        });
      }

      // Append the latest user query
      messages.push({
        role: 'user',
        content: query,
      });


      const chatCompletion = await this.groq.chat.completions.create({
        messages: messages,
        model: 'llama-3.1-8b-instant',
      });
      const replyText = chatCompletion.choices[0]?.message?.content || '';
      // Save back to DB if user is logged in
      if (dbHistoryDoc) {
        dbHistoryDoc.history.push({ role: 'user', parts: [{ text: query }] });
        dbHistoryDoc.history.push({ role: 'model', parts: [{ text: replyText }] });
        // Keep only the last 20 messages (10 turns) to prevent exceeding token limits over time
        if (dbHistoryDoc.history.length > 20) {
          dbHistoryDoc.history = dbHistoryDoc.history.slice(-20);
        }
        await dbHistoryDoc.save();
      }
      return {
        reply: replyText,
      };
    } catch (error: any) {
      console.error('Error generating AI response:', error);
      console.error('Status:', error?.status);
      console.error('Message:', error?.message);
      console.error('Full Error:', JSON.stringify(error, null, 2));
      throw new InternalServerErrorException('Failed to process AI chat query');
    }
  }
}

