import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsInt()
  @IsPositive()
  authorId: number;
}
