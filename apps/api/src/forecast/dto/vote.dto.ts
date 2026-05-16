import { IsIn, IsString } from 'class-validator';

export class VoteDto {
  @IsString() sessionId: string;
  @IsIn(['up', 'down', 'flat']) direction: string;
}
