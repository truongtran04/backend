import { UserWithoutPassword, User } from "../users/user.interface";
import { Patient } from "../patients/patient.interface";
import { LoginDTO } from "./dto/login.dto";
import { Request } from 'express';
import { RegisterDTO } from "./dto/register.dto";

export interface ILoginResponse {
    accessToken: string,
    crsfToken: string,
    expiresAt: number,
    tokenType: string,
}

export interface IJwtPayload {
    sub: string,
    iat: number,
    exp: number,
    guard: string,
}

export interface ITokenContext {
    authRequest: LoginDTO,
    user: UserWithoutPassword | null,
    deviceId: string,
    accessToken?: string,
    refreshToken?: string,
    crsfToken?: string,
    sessionId?: string,
    guard: string,
    session?: ISessionData | null,
    userSessions?: string[],
    request?: Request
}

export interface ISessionData {
    userId: string,
    deviceId: string,
    refreshToken: string,
    crsfToken: string,
    createdAt: number,
    lastUsed: number,
    wasUsed: boolean,
    isRevoked: boolean,
    expiresAt: number,
}

export interface IForgotPasswordContext {
    email: string,
    user?: User,
    resetToken?: string,
    hashedToken?: string,
    expiresAt?: Date
}

export interface IRegisterContext {
    authRequest: RegisterDTO
    user?: User,
    patient?: Patient,
    confirmToken?: string,
    hashedConfirmToken?: string,
    hashedPassword?: string,
    expiresAt?: Date,
    emailVerificationSent?: boolean
}

export interface IAuthUser {
  userId: string;
  guard: string;
  role: string;
}
