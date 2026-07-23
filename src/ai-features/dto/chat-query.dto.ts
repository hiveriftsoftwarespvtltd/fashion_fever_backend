import { IsNotEmpty, IsString } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @IsNotEmpty()
  query!: string;
}
