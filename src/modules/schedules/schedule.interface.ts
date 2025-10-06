export interface ScheduleRequest {
    schedule_date: string;
    start_time: string;
    end_time: string;
}

export interface ScheduleUTC {
    schedule_date: Date;
    start_time: Date;
    end_time: Date;
}