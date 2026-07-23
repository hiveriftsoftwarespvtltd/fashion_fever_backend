import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiFeaturesController } from './ai-features.controller';
import { AiFeaturesService } from './ai-features.service';
import { AIChatHistory, AIChatHistorySchema } from './schema/ai-chat-history';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AIChatHistory.name, schema: AIChatHistorySchema }])
  ],
  controllers: [AiFeaturesController],
  providers: [AiFeaturesService]
})
export class AiFeaturesModule {}
