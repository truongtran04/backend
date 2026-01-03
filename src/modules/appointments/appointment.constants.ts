import { AppointmentStatus } from "./appointment.interface";

export const APPOINTMENT_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  [AppointmentStatus.PENDING]: [
    AppointmentStatus.CONFIRM,
    AppointmentStatus.CANCEL,
  ],

  [AppointmentStatus.CONFIRM]: [
    AppointmentStatus.COMPLETE,
    AppointmentStatus.CANCEL,
    AppointmentStatus.NO_SHOW,
  ],

  [AppointmentStatus.COMPLETE]: [],
  [AppointmentStatus.CANCEL]: [],
  [AppointmentStatus.NO_SHOW]: [],
};
