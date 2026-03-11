
import { User, PatientRecord, Appointment, AuditLog } from './types';

// Mock Users
export const MOCK_USERS: User[] = [
  { id: '1', name: 'Dr. Sarah Wilson', email: 'doctor@healthsecure.com', role: 'Doctor', avatarUrl: 'https://picsum.photos/seed/doc1/200/200' },
  { id: '2', name: 'Nurse James Miller', email: 'nurse@healthsecure.com', role: 'Nurse', avatarUrl: 'https://picsum.photos/seed/nurse1/200/200' },
  { id: '3', name: 'Alice Thompson', email: 'patient@healthsecure.com', role: 'Patient', avatarUrl: 'https://picsum.photos/seed/pat1/200/200' },
  { id: '4', name: 'Robert Reception', email: 'reception@healthsecure.com', role: 'Receptionist', avatarUrl: 'https://picsum.photos/seed/recep1/200/200' },
  { id: '5', name: 'Admin Chief', email: 'admin@healthsecure.com', role: 'Administrator', avatarUrl: 'https://picsum.photos/seed/admin1/200/200' },
];

// Mock Patient Records
export const MOCK_PATIENTS: PatientRecord[] = [
  {
    id: 'pat-1',
    patientName: 'Alice Thompson',
    age: 32,
    gender: 'Female',
    bloodType: 'A+',
    history: [
      { id: 'n-1', date: '2024-05-10', note: 'Patient complains of chronic migraines. Prescribed rest and monitoring.', author: 'Dr. Sarah Wilson' }
    ],
    vitals: [
      { id: 'v-1', date: '2024-05-15', heartRate: 72, bloodPressure: '120/80', temperature: 98.6, author: 'Nurse James Miller' }
    ],
    prescriptions: [
      { id: 'p-1', date: '2024-05-10', medication: 'Sumatriptan', dosage: '50mg', instructions: 'Take at onset of migraine', author: 'Dr. Sarah Wilson' }
    ]
  },
  {
    id: 'pat-2',
    patientName: 'Bob Henderson',
    age: 45,
    gender: 'Male',
    bloodType: 'O-',
    history: [],
    vitals: [],
    prescriptions: []
  }
];

// Mock Appointments
export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'app-1', patientId: 'pat-1', patientName: 'Alice Thompson', doctorId: '1', doctorName: 'Dr. Sarah Wilson', date: '2024-06-15', time: '10:30 AM', status: 'Scheduled' },
  { id: 'app-2', patientId: 'pat-2', patientName: 'Bob Henderson', doctorId: '1', doctorName: 'Dr. Sarah Wilson', date: '2024-06-16', time: '02:00 PM', status: 'Scheduled' },
];

// Mock Audit Logs
export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', timestamp: '2024-05-20T08:00:00Z', userId: '1', userName: 'Dr. Sarah Wilson', action: 'Login', details: 'Successful login from IP 192.168.1.5', severity: 'low' },
  { id: 'log-2', timestamp: '2024-05-20T09:15:00Z', userId: '1', userName: 'Dr. Sarah Wilson', action: 'View Record', details: 'Viewed record for Alice Thompson', severity: 'low' },
  { id: 'log-3', timestamp: '2024-05-20T10:45:00Z', userId: '3', userName: 'Alice Thompson', action: 'Book Appointment', details: 'Booked appointment for 2024-06-15', severity: 'low' },
  { id: 'log-4', timestamp: '2024-05-20T23:59:00Z', userId: 'unknown', userName: 'System', action: 'Failed Login', details: 'Multiple failed attempts from IP 45.33.22.11', severity: 'high' },
];
