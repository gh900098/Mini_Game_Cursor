import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'User password (min 9 chars, 1 upper, 1 lower, 1 num, 1 special)',
    minLength: 9,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(9)
  // Complex password: 1 upper, 1 lower, 1 num, 1 special
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{9,}$/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, 1 special character, and be at least 9 characters long',
  })
  // Basic anti-injection check (reject common SQL/script keywords if they appear as standalone words or obvious patterns)
  // Note: This is an extra precaution; ORM handles SQL injection.
  @Matches(/^((?!(select|update|delete|insert|drop|alter|script|<|>)).)*$/i, {
    message: 'Password contains unsafe patterns',
  })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'User mobile number',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9\s-]{7,15}$/, {
    message: 'Mobile number must be valid (digits, spaces, dashes, optional +)',
  })
  mobile?: string;

  @ApiProperty({
    example: 'Software Engineer',
    description: 'Short bio',
    required: false,
  })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({
    example: 'Detailed description...',
    description: 'Long description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'Internal remark',
    description: 'Admin remark',
    required: false,
  })
  @IsString()
  @IsOptional()
  remark?: string;
}
