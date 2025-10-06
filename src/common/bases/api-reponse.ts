import { ApiResponseKey } from "src/enums/api-reponse-key.enum";
import { HttpStatus } from "@nestjs/common";

interface ApiResponseData<T, E = unknown> {
    [ApiResponseKey.STATUS] : boolean,
    [ApiResponseKey.CODE] : HttpStatus,
    [ApiResponseKey.DATA]? : T,
    [ApiResponseKey.ERROR]? : E,
    [ApiResponseKey.MESSAGE] : string,
    [ApiResponseKey.TIMESTAMP] : string
}

export type TApiReponse<T, E = unknown> = ApiResponseData<T, E>

export class ApiResponse {

    private static getTimestamp(): string {
        return new Date().toISOString();
    }

    static suscess<T>(
        data: T,
        message: string = '',
        httpStatus: HttpStatus = HttpStatus.OK,
    ): ApiResponseData<T> {

        return {
            [ApiResponseKey.STATUS] : true,
            [ApiResponseKey.CODE] : httpStatus,
            [ApiResponseKey.DATA] : data,
            [ApiResponseKey.MESSAGE] : message,
            [ApiResponseKey.TIMESTAMP] : this.getTimestamp()
        }

    }

    static error<E>(
        error: E,
        message: string,
        httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR

    ): ApiResponseData<E> {

        return {
            [ApiResponseKey.STATUS] : false,
            [ApiResponseKey.CODE] : httpStatus,
            [ApiResponseKey.ERROR] : error,
            [ApiResponseKey.MESSAGE] : message,
            [ApiResponseKey.TIMESTAMP] : this.getTimestamp()
        }
    }

    static message(
        message: string,
        httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR
    ): ApiResponseData<string, unknown> {

        return {
            [ApiResponseKey.STATUS] : httpStatus === HttpStatus.OK || httpStatus === HttpStatus.CREATED,
            [ApiResponseKey.CODE] : httpStatus,
            [ApiResponseKey.MESSAGE] : message,
            [ApiResponseKey.TIMESTAMP] : this.getTimestamp(),
            
        }

    }


}