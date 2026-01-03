import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PythonClassifyPayload, PythonDiagnoseResponse, PythonIntentResponse } from './dto/python-interface.dto';
import { DoctorService } from '../doctors/doctor.service';
import { AppointmentService } from '../appointments/appointment.service'; // Giả sử bạn có service này
import { SpecialtyService } from '../specialties/specialty.service';

@Injectable()
export class MedbotService {
  constructor(
    private readonly httpService: HttpService,
    private readonly doctorService: DoctorService,
    private readonly specialtyService: SpecialtyService,
    private readonly appointmentService: AppointmentService,
  ) {}

  // --- HÀM CHÍNH: Xử lý tin nhắn User ---
  async processUserMessage(text: string, userId: number = 1) { // Thêm userId để đặt lịch
    try {
      const payload: PythonClassifyPayload = {
        text: text,
        current_time: new Date().toISOString()
      };
      // BƯỚC 1: Gọi Python để phân loại Intent
      const pythonUrl = 'http://localhost:8000/nlp/classify-intent';

      const response = await lastValueFrom(
        this.httpService.post(pythonUrl, payload)
      );

      const aiResult = <PythonIntentResponse>response.data; 
      console.log('🤖 AI Intent Detected:', aiResult);

      // BƯỚC 2: Điều hướng (Switch Case)
      switch (aiResult.intent) {
        
        case 'DIAGNOSE':
          // Gọi lại logic chẩn đoán bệnh (Hàm cũ của bạn)
          return await this.processHealthCheck(text);

        case 'BOOKING':
          if (!aiResult.entities.doctor_name) {
            return { type: 'TEXT', message: "Bạn muốn đặt lịch với bác sĩ nào?" };
          }

          if (!aiResult.entities.time) {
              return await this.appointmentService.suggestAppointmentTimes(
                  aiResult.entities.doctor_name
              );
          }

          return await this.appointmentService.createAppointmentFromPy(
            userId,
            aiResult.entities.doctor_name,
            aiResult.entities.time,
          );

        case 'DOCTOR_INFO':
          // Gọi logic tìm thông tin bác sĩ
          if (!aiResult.entities.doctor_name) {
            return { message: "Bạn muốn tìm thông tin của bác sĩ nào?" };
          }
          return await this.doctorService.findDoctorsByName(aiResult.entities.doctor_name);

        case 'OTHER':
        default:
          return { message: "Tôi có thể giúp bạn chẩn đoán bệnh, tìm bác sĩ hoặc đặt lịch khám. Bạn cần giúp gì không?" };
      }

    } catch (error) {
      console.error("Error in processUserMessage:", error);
      return { message: "Hệ thống đang bận, vui lòng thử lại sau." };
    }
  }

  // --- HÀM PHỤ: Logic Chẩn đoán bệnh (Code cũ của bạn, chuyển thành private) ---
  private async processHealthCheck(userPrompt: string) {
    try {
      const pythonApiUrl = 'http://localhost:8000/nlp/diagnose-rag';
      const response = await lastValueFrom(
        this.httpService.post<PythonDiagnoseResponse>(pythonApiUrl, { text: userPrompt })
      );
      const aiResult = response.data;

      if (aiResult.diagnosis.confidence < 0.4) {
         return {
             message: "Chúng tôi chưa xác định rõ bệnh. Vui lòng mô tả kỹ hơn hoặc đi khám tổng quát.",
             rag_advice: aiResult.rag_advice,
             doctors: [] 
         }
      }

      const specialtyCode = aiResult.diagnosis.specialty;
      
      // Sửa tên service cho đúng với Inject bên trên
      const specialty = await this.specialtyService.getSpecialtyId(specialtyCode);
      const suggestedDoctors = await this.doctorService.findByField("specialty_id", specialty);
      
      return {
        type: 'DIAGNOSIS_RESULT', // Thêm type để Frontend dễ xử lý hiển thị
        analysis: {
          detected_disease: aiResult.diagnosis.disease_name,
          specialty: aiResult.diagnosis.specialty,
          confidence: aiResult.diagnosis.confidence,
        },
        rag_advice: aiResult.rag_advice,
        doctors: suggestedDoctors
      };

    } catch (error) {
      console.error("Error calling Python Diagnose:", (error as Error).message);
      throw new HttpException('AI Service unavailable', HttpStatus.BAD_GATEWAY);
    }
  }
}