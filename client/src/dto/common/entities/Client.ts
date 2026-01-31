/**
 * Core client entity
 */
export type Client = {
  clientID: number;
  fName: string;
  lName: string;
  fullName?: string;
  companyID?: number;
  companyName?: string;
};
