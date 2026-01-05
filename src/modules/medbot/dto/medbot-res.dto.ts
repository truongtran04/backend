export class MedbotResponseDto {
    type: 'TEXT' | 'DIAGNOSIS_RESULT' | 'DOCTOR_LIST' | 'BOOKING_SUGGESTION' | 'BOOKING_SUCCESS';
    message: string;
    data?: any;
    analysis?: any;
    rag_advice?: string;
    doctors?: any;
}