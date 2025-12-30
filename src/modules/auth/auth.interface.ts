import { UserWithoutPassword, User } from "../users/user.interface";
import { Patient } from "../patients/patient.interface";
import { LoginDTO } from "./dto/login.dto";
import { Request } from 'express';
import { RegisterDTO } from "./dto/register.dto";
import { Role } from "@prisma/client";


export interface ILoginResponse {
    accessToken: string,
    csrfToken: string,
    expiresAt: number,
    tokenType: string,
}

export interface IJwtPayload {
    role: Role,
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
    csrfToken?: string,
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
    csrfToken: string,
    createdAt: number,
    lastUsed: number,
    wasUsed: boolean,
    isRevoked: boolean,
    expiresAt: number,
}

export interface IForgotPasswordContext {
    email: string,
    user?: User,
    resetOTP?: string,
    hashedOTP?: string,
    expiresAt?: Date
}

export interface IRegisterContext {
    authRequest: RegisterDTO
    user?: User,
    patient?: Patient,
    confirmOTP?: string,
    hashedConfirmOTP?: string,
    hashedPassword?: string,
    expiresAt?: Date,
    emailVerificationSent?: boolean
}

export interface IAuthUser {
  userId: string;
  guard: string;
  role: string;
}
