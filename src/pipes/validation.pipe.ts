import { PipeTransform, Injectable, ArgumentMetadata, HttpStatus, HttpException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApiResponse } from 'src/common/bases/api-reponse';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {

    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value)
    
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
        const { errors: formattedErrors, message } = this.formatErrors(errors);
        const response = ApiResponse.error(
          formattedErrors, 
          message,
          HttpStatus.UNPROCESSABLE_ENTITY
        );
        throw new HttpException(response, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]) {
    const result = {};
    const messages: string[] = [];
    
    errors.forEach((error) => {
      if (error.constraints) {

        result[error.property] = Object.values(error.constraints);

        let messageForThisField = '';

        if (error.constraints['isNotEmpty']) {
          messageForThisField = error.constraints['isNotEmpty'];
        } else {
          messageForThisField = Object.values(error.constraints)[0];
        }
        
        messages.push(messageForThisField);
      }
    });
    
    const combinedMessage = messages.join('\n');
    
    return {
      errors: result,
      message: combinedMessage || 'Dữ liệu không hợp lệ'
    };
  }
}