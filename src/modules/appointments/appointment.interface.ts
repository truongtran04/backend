export enum AppointmentStatus {
    PENDING = 'pending',
    CONFIRM = 'confirmed',
    COMPLETE = 'completed',
    CANCEL = 'cancelled',
    NO_SHOW = 'no_show'
}

// Interface kết quả trả về
export interface StatusMessage {
    status: AppointmentStatus;
    message: string;
}