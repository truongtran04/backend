export const RELATIONS = {
  APPOINTMENT: {
    Patient: true,
    Doctor: true,
    DoctorSchedule: true,
  },
  PATIENT: {
    User: true,
  },
  DOCTOR: {
    User: true,
    Specialty: true
  },
  SCHEDULE: {
    Doctor: true
  }
};
