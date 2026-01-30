/**
 * Request payload for employee sign up
 */
export interface SignUpRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
  companyName: string;
}
