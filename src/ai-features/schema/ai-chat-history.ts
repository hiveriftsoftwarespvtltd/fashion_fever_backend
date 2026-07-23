import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AIChatHistoryDocument = AIChatHistory & Document;

@Schema({ _id: false })
export class ChatPart {
  @Prop({ type: String, required: true })
  text!: string;
}

@Schema({ _id: false })
export class ChatHistoryEntry {
  @Prop({ type: String, enum: ['user', 'model'], required: true })
  role!: 'user' | 'model';

  @Prop({ type: [SchemaFactory.createForClass(ChatPart)], required: true })
  parts!: ChatPart[];
}

@Schema({ timestamps: true })
export class AIChatHistory {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, unique: true })
  user!: Types.ObjectId;

  @Prop({ type: [SchemaFactory.createForClass(ChatHistoryEntry)], default: [] })
  history!: ChatHistoryEntry[];
}

export const AIChatHistorySchema = SchemaFactory.createForClass(AIChatHistory);