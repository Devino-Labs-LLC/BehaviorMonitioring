export interface UpdateHomeRequest {
    homeID: number;
    name: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    capacity: number;
    employeeUsername: string;
}
