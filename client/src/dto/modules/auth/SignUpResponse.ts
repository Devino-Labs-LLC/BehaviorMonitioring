import { BaseResponse } from '../../common/BaseResponse';

/**
 * Response from the sign up endpoint
 */
export interface SignUpResponse extends BaseResponse {
  signupSuccess: boolean;
  message?: string;
  userId?: number;
  emailVerificationSent?: boolean;
}
