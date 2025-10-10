import { Body, Controller, HttpStatus, Post, Get, Param, Req, HttpCode, UseGuards, UnauthorizedException, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ValidationPipe } from '../../pipes/validation.pipe';
import { LoginDTO } from './dto/login.dto';
import { ApiResponse } from 'src/common/bases/api-reponse';
import type { TApiReponse } from 'src/common/bases/api-reponse';
import { ILoginResponse } from './auth.interface';
import type { Request, Response } from 'express';
import { UserService } from '../users/user.service';
import { common } from 'src/config/constant';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { IUserResponse } from '../users/user.interface';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ResetPasswordRequest } from './dto/reset-password.dto';
import { RegisterDTO } from './dto/register.dto';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';

const GUARD = common.admin

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) { }


  @Post('/register')
  @HttpCode(HttpStatus.OK)
  async register(
    @Body(new ValidationPipe()) authRequest: RegisterDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<TApiReponse<string>> {
    const dataResponse = await this.authService.register(authRequest, request, response);
    return ApiResponse.message(dataResponse.message, HttpStatus.OK);
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe()) authRequest: LoginDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<TApiReponse<ILoginResponse>> {
    const dataResponse = await this.authService.authenticate(authRequest, request, GUARD, response);
    return ApiResponse.suscess(dataResponse, 'Đăng nhập thành công', HttpStatus.OK);
  }

  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  async profile(
    @Req() request: Request
  ): Promise<TApiReponse<IUserResponse>> {
    try {
      const auth = (request.user as { userId: string })
      const user = await this.userService.findById(auth.userId)

      if (!user) {
        throw new UnauthorizedException("Thông tin không hợp lệ")
      }

      const userWithoutPassword: IUserResponse = {
        id: user.user_id,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
      
      return ApiResponse.suscess(userWithoutPassword, "Success!", HttpStatus.OK);
    } catch (err) {
      throw err
    }
  }

  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<TApiReponse<ILoginResponse>> {
    const res = await this.authService.refreshToken(request, GUARD, response);
    return ApiResponse.suscess(res, 'RefreshToken thành công', HttpStatus.OK);
  }

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<TApiReponse<string>> {
    const res = await this.authService.logout(request, GUARD, response)
    return ApiResponse.message("Đăng xuất thành công", HttpStatus.OK)
  }

  @Post('/forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ValidationPipe()) forgotPasswordRequest: ForgotPasswordDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<TApiReponse<string>> {
    const res = await this.authService.forgotPassword(forgotPasswordRequest, request, response)
    return ApiResponse.message(res.message, HttpStatus.OK)
  }

  @Get('/verify-reset-otp/:otp')
  @HttpCode(HttpStatus.OK)
  async verifyResetToken(
    @Param('otp') otp: string,
  ): Promise<TApiReponse<string>> {
    const res = await this.authService.verifyResetToken(otp)
    return ApiResponse.message(res.message, HttpStatus.OK)
  }

  @Post('/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ValidationPipe()) resetPasswordRequest: ResetPasswordRequest
  ): Promise<TApiReponse<string>> {
    const res = await this.authService.resetPassword(resetPasswordRequest.otp, resetPasswordRequest.password)
    return ApiResponse.message(res.message, HttpStatus.OK)
  }

  @Get('/verify-email/:token')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Param('token') token: string
  ): Promise<TApiReponse<string>> {
    const res = await this.authService.verifyEmail(token);
    return ApiResponse.message(res.message, HttpStatus.OK);
  }

}
