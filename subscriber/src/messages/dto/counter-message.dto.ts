import { Type } from 'class-transformer';
import { IsDivisibleBy, IsInt } from 'class-validator';

export class CounterMessageDTO {
  @Type(() => Number)
  @IsInt()
  @IsDivisibleBy(2)
  value: number;
}
