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

/**
 * Transform string date (YYYY-MM-DD) to Date object for Prisma
 */
export const ToDate = () => {
    return ({ value }: TransformFnParams) => {
        if (!value) return null;
        // If it's already a Date object, return it
        if (value instanceof Date) return value;
        // If it's a string in YYYY-MM-DD format, convert to Date
        if (typeof value === 'string') {
            // Check if it's YYYY-MM-DD format (10 characters)
            if (value.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                // Parse as UTC date to avoid timezone issues
                // YYYY-MM-DD format is parsed as UTC by JavaScript
                return new Date(value + 'T00:00:00.000Z');
            }
            // Otherwise, try to parse it as-is
            const date = new Date(value);
            // Check if date is valid
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date format: ${value}`);
            }
            return date;
        }
        return new Date(value as number | Date);
    };
};