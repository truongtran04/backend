export interface PythonIntentResponse {
  intent: 'DIAGNOSE' | 'BOOKING' | 'DOCTOR_INFO' | 'OTHER';
  entities: {
    doctor_name: string | null;
    time: string | null;     // Format: "YYYY-MM-DD HH:mm:ss"
    symptoms: string | null;
  };
}

// 2. Response từ API /nlp/diagnose-rag
export interface PythonDiagnoseResponse {
  user_query: string;
  diagnosis: {
    disease_name: string;
    confidence: number;
    specialty: string; // Mã khoa (VD: 'noi_tieu_hoa')
  };
  rag_advice: string;
}

// 3. Request Body gửi sang Python (Payload)
export interface PythonClassifyPayload {
  text: string;
  current_time: string;
}

export interface PythonDiagnosePayload {
  text: string;
}