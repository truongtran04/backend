// src/utils/date-transformer.ts
import { TransformFnParams } from "class-transformer";

/**
 * Transform date to YYYY-MM-DD in UTC+7
 */
export const ToLocalDate = () => {
    return ({ value }: TransformFnParams) => {
        if (!value) return null;
        const date = new Date(value as string | number | Date);
        const offset = 7 * 60 * 60 * 1000; // +7 hours in milliseconds
        const localDate = new Date(date.getTime() + offset);
        return localDate.toISOString().split('T')[0]; // YYYY-MM-DD
    };
};

/**
 * Transform date to HH:MM in UTC+7
 */
export const ToLocalTime = () => {
    return ({ value }: TransformFnParams) => {
        if (!value) return null;
        const date = new Date(value as string | number | Date);
        const offset = 7 * 60 * 60 * 1000; // +7 hours in milliseconds
        const localDate = new Date(date.getTime() + offset);
        return localDate.toISOString().substr(11, 5); // HH:MM
    };
};

/**
 * Transform date to full ISO string in UTC+7
 */
export const ToLocalISOString = () => {
    return ({ value }: TransformFnParams) => {
        if (!value) return null;
        const date = new Date(value as string | number | Date);
        const offset = 7 * 60 * 60 * 1000; // +7 hours in milliseconds
        const localDate = new Date(date.getTime() + offset);
        return localDate.toISOString();
    };
};
