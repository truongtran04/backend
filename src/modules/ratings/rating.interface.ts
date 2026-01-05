// Interface cho DoctorRating
export interface IDoctorRating {
  rating_id: string;
  doctor_id: string;
  patient_id: string;
  rating_score: number;
  created_at: Date;
  updated_at: Date;
}

// Interface cho DoctorReview
export interface IDoctorReview {
  review_id: string;
  doctor_id: string;
  patient_id: string;
  title?: string;
  content: string;
  rating_score: number;
  helpful_count: number;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

// Interface cho ReviewHelpful
export interface IReviewHelpful {
  id: string;
  review_id: string;
  patient_id: string;
  is_helpful: boolean;
  created_at: Date;
}

// Interface cho phản hồi API
export interface IRatingResponse {
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
}
