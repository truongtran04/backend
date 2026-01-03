export interface User {
    user_id: string,
    email: string,
    password_hash: string,
    role: string,
    is_active: boolean,
    created_at: Date,
    updated_at: Date,
    passwordResetToken?: string | null,
    passwordResetTokenExpires?: Date | null,
}

export interface IUserResponse {
    id: string,
    doctorId?: string,
    patientId?: string,
    email: string,
    password?: string,
    role: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
}

export type UserWithoutPassword = Omit<User, 'password_hash'>;
