export interface ArchivedClient {
  clientID: number;
  fName: string;
  lName: string;
  DOB: string;
  intake_Date: string;
  group_home_name?: string;
  medicaid_id_number?: string;
  behavior_plan_due_date?: string;
  entered_by: string;
  companyID: number;
  companyName: string;
  date_entered: string;
  time_entered: string;
  status: 'Archived';
  archived_date: string;
  archived_deletion_date: string;
  archived_by: string;
  reminder_90_sent: boolean;
  reminder_60_sent: boolean;
  reminder_30_sent: boolean;
}

export interface ArchiveClientRequest {
  clientID: number;
}

export interface ArchiveClientResponse {
  statusCode: number;
  serverMessage?: string;
  errorMessage?: string;
  archiveDate?: string;
  deletionDate?: string;
}

export interface GetArchivedClientsResponse {
  statusCode: number;
  serverMessage?: string;
  errorMessage?: string;
  archivedClients: ArchivedClient[];
  count: number;
}

export interface GetArchivedClientRequest {
  clientID: number;
}

export interface GetArchivedClientResponse {
  statusCode: number;
  serverMessage?: string;
  errorMessage?: string;
  client: ArchivedClient;
}

export interface UnarchiveClientRequest {
  clientID: number;
}

export interface UnarchiveClientResponse {
  statusCode: number;
  serverMessage?: string;
  errorMessage?: string;
}

export interface DeleteArchivedClientRequest {
  clientID: number;
}

export interface DeleteArchivedClientResponse {
  statusCode: number;
  serverMessage?: string;
  errorMessage?: string;
}
