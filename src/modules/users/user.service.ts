import { Inject, Injectable, Logger, BadRequestException } from "@nestjs/common";
import { UserRepository } from "./user.repository";
import { BaseService } from "src/common/bases/base.service";
import { User } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { ValidateService } from 'src/modules/validate/validate.service';
import { CreateUserDTO } from "./dto/create-user.dto";
import { UpdateUserDTO } from "./dto/update-user.dto";
import * as bcrypt from 'bcrypt';
import { PatientService } from "../patients/patient.service";
import { CreateDoctorDTO } from "../doctors/dto/create-doctor.dto";
import { SpecificationBuilder } from "src/classes/specification-builder.class";

@Injectable()
export class UserService extends BaseService<UserRepository, User> {
    private readonly userLogger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    protected readonly prismaService: PrismaService,
    private readonly validateService: ValidateService,
    private readonly patientService: PatientService,

  ){
    super(
      userRepository,
      prismaService,
      new SpecificationBuilder({
        defaultSort: 'created_at, desc', // Sắp xếp mặc định
        searchFields: ['email'], // Các field có thể search
        simpleFilter: ['user_id', 'role', 'is_active'], // Các field có thể filter đơn giản
        dateFilter: ['created_at', 'updated_at'], // Các field date có thể filter
        fieldTypes: {
          user_id: 'string',
          role: 'string',
          is_active: 'boolean',
        }
      })
    )
  }

  protected async beforeSave(id?: string, payload?: CreateUserDTO | UpdateUserDTO): Promise<this>{
    if(!payload){
      throw new BadRequestException('Dữ liệu không hợp lệ')
    }
    await this.validateService.model('user')
      .context({ primaryKey: 'user_id', id })
      .unique('email', payload.email, 'Email đã tồn tại')
      .validate()
  
    return Promise.resolve(this)
  }

  async findByEmail(email: string): Promise<User | null>{
    const model = await this.userRepository.findByField('email', email)
    return model
  }

  async findResetToken(token: string ): Promise<User | null>{
    const model = await this.userRepository.isValidResetToken(token)
    return model
  }

  async findUserByVerificationToken(token: string): Promise<User | null>{
    const model = await this.userRepository.isValidActive(token)
    return model
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    return hashedPassword
  }

  async createUserWithPatient(request: CreateUserDTO): Promise<User> {

    const hashedPassword = await this.hashPassword(request.password_hash);

    const userData = await this.save({
      ...request,
      password_hash: hashedPassword,
    });

    await this.patientService.createBasicPatient(userData.user_id)

    return userData
  }

  async createUserWithDoctor(request: CreateDoctorDTO): Promise<User> {
    const { email } = request

    const hashedPassword = await this.hashPassword("12345678")

    const userData = await this.save({
      email: email,
      password_hash: hashedPassword,
      role: 'doctor',
      is_active: false
    })

    return userData
  }

  
}