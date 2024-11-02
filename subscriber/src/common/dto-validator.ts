import { LoggerService } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

export class DTOValidator<T extends object> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly dtoClass: ClassConstructor<T>,
  ) {}

  public async validate(plain: unknown): Promise<T | null> {
    const input: unknown =
      typeof plain === 'string' ? JSON.parse(plain) : plain;

    const item = plainToInstance(this.dtoClass, input);
    const errors = await validate(item);

    if (errors.length === 0) return item;

    this.logErrors(errors);

    return null;
  }

  private logErrors(errors: ValidationError[]): void {
    for (const error of errors) {
      this.logger.warn(
        `Invalid message: ${error.toString(false, false, undefined, true)}`,
      );
    }
  }
}
