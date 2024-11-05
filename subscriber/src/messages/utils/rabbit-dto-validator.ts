import { LoggerService } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

export class RabbitDTOValidator<T extends object> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly dtoClass: ClassConstructor<T>,
  ) {}

  public async validate(plain: unknown): Promise<T | null> {
    const value = this.parseJSON(plain);
    if (!value) return null;

    const item = this.transform(value);
    if (!item) return null;

    const errors = await validate(item);
    if (errors.length === 0) return item;

    this.logErrors(errors);

    return null;
  }

  private parseJSON(plain: unknown): object | null {
    try {
      let value: unknown = plain;
      if (typeof value === 'string') value = JSON.parse(value);
      if (typeof value === 'object' && value !== null) return value;
      throw new Error('Value is not an object');
    } catch (error) {
      this.logger.error(
        'Cannot parse RabbitMQ message: not an object nor valid JSON object',
        String(plain),
        error,
      );

      return null;
    }
  }

  private transform(value: object): T | null {
    try {
      return plainToInstance(this.dtoClass, value);
    } catch (error) {
      this.logger.error(
        `Cannot transform RabbitMQ message (${this.dtoClass.name})`,
        error,
      );

      return null;
    }
  }

  private logErrors(errors: ValidationError[]): void {
    for (const error of errors) {
      this.logger.warn(
        `Invalid message: ${error.toString(false, false, undefined, true)}`,
      );
    }
  }
}
