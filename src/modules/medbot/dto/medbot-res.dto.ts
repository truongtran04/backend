export class MedbotResponseDto {
  // Loại tin nhắn để Frontend biết vẽ UI (VD: vẽ form đặt lịch hay vẽ text lời khuyên)
  type: 'DIAGNOSIS_RESULT' | 'BOOKING_SUCCESS' | 'BOOKING_SUGGESTION' | 'DOCTOR_LIST' | 'TEXT';
  
  // Tin nhắn hiển thị cho user
  message: string; 
  
  // Dữ liệu kèm theo (Dynamic)
  data?: any; 
}