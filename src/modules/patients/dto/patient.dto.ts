import { Expose, Exclude, Transform, TransformFnParams } from "class-transformer";
import { ToLocalISOString } from "src/utils/date-transformer";

export class PatientDTO {

  @Expose({name: 'patient_id'})
  id: string;

  @Expose()
  user_id: string;

  @Expose()
  @Transform(({ obj }) => obj.User.email ?? null)
  email: string;

  @Expose()
  full_name: string;

  @Expose()
  identity_number: string;

  @Expose()
  phone_number: string;

  @Expose()
  date_of_birth: string;

  @Expose()
  gender: string;

  @Expose()
  address: string;

  @Expose()
  ethnicity: string;

  @Expose()
  health_insurance_number: string;

  @Expose()
  referral_code: string;

  @Expose()
  occupation: string;

  @Expose({ name: 'created_at' })
  @Transform(ToLocalISOString())
  createdAt: Date

  @Expose({ name: 'updated_at' })
  @Transform(ToLocalISOString())
  updatedAt: Date
}