import { ExceptionFilter, Catch, ArgumentsHost, UnauthorizedException, HttpStatus, HttpException } from "@nestjs/common";
import { Response } from "express";
import { ApiResponse } from "src/common/bases/api-reponse";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR; //500
        let message: string = 'Network Error';
        let error: unknown = null;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if(typeof exceptionResponse === 'string'){
                message = exceptionResponse;
            }
            else if(typeof exceptionResponse === 'object' && exceptionResponse){

                const reponseObject = exceptionResponse as Record<string, unknown>;
                if(typeof reponseObject.message === 'string'){
                    message = reponseObject.message;
                }
                else {
                    message = 'Lỗi hệ thống, vui lòng thử lại sau';
                }

                if(reponseObject.error){
                    error = reponseObject.error;
                }

                if(reponseObject.status !== undefined && reponseObject.cade !== undefined){
                    response.status(status).json(exceptionResponse);
                    return;
                }
                
            }

            switch(status) {
                case HttpStatus.BAD_REQUEST: //400
                    message = message || 'Yêu cầu không hợp lệ';
                    break;
                case HttpStatus.UNAUTHORIZED: //401
                    message = message || 'Bạn cần đăng nhập để thực hiện hành động này';
                    break;
                case HttpStatus.FORBIDDEN: //403
                    message = message || 'Bạn không có quyền thực hiện hành động này';
                    break;
                case HttpStatus.NOT_FOUND: //404
                    message = message || 'Không tìm thấy tài nguyên được yêu cầu';
                    break;
                case HttpStatus.UNPROCESSABLE_ENTITY: //422
                    message = message || 'Dữ liệu không hợp lệ';
                    break;
                case HttpStatus.INTERNAL_SERVER_ERROR: //500
                    message = message || 'Lỗi INTERNAL_SERVER_ERROR';
                    break;
                default:
                    break;
            }
        }
        else if(exception instanceof Error) {
            console.log("Error: ", exception.message);
            console.log("Stack:", exception.stack);
            
        }
        else {
            message = "Lỗi hệ thống, vui lòng thử lại sau";
        }
        
        const apiResponse = (error) ? ApiResponse.error(error, message, status) : ApiResponse.message(message, status);
        response.status(status).json(apiResponse);


    }
}