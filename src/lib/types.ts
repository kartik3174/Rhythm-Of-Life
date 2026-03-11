
export type UserRole = 'Patient' | 'Doctor' | 'Nurse' | 'Receptionist' | 'Administrator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface PatientRecord {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  bloodType: string;
  history: MedicalNote[];
  vitals: VitalSign[];
  prescriptions: Prescription[];
}

export interface MedicalNote {
  id: string;
  date: string;
  note: string;
  author: string;
}

export interface VitalSign {
  id: string;
  date: string;
  heartRate: number;
  bloodPressure: string;
  temperature: number;
  author: string;
}

export interface Prescription {
  id: string;
  date: string;
  medication: string;
  dosage: string;
  instructions: string;
  author: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
}
