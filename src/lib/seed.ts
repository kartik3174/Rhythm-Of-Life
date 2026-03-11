import { collection, addDoc, getDocs, writeBatch, doc, Firestore } from 'firebase/firestore';
import { MOCK_USERS, MOCK_PATIENTS, MOCK_APPOINTMENTS } from './store';

export async function seedDatabase(db: Firestore) {
    const batch = writeBatch(db);

    // 1. Seed Users (mapped to MOCK_USERS but we use their IDs as document IDs)
    // Note: These IDs won't match Auth IDs unless they are already there,
    // but for "listing" purposes in dropdowns, they serve as records.
    for (const user of MOCK_USERS) {
        const userRef = doc(db, 'users', `mock-${user.id}`);
        batch.set(userRef, {
            ...user,
            mfaEnrolled: true,
            createdAt: new Date().toISOString()
        });
    }

    // 2. Seed Medical Records (from MOCK_PATIENTS)
    for (const patient of MOCK_PATIENTS) {
        const recordRef = doc(db, 'medical_records', `mock-${patient.id}`);
        batch.set(recordRef, {
            ...patient,
            patientId: `mock-${patient.id.replace('pat-', '')}`, // linkage
            createdAt: new Date().toISOString()
        });
    }

    // 3. Seed Appointments
    for (const app of MOCK_APPOINTMENTS) {
        const appRef = doc(db, 'appointments', `mock-${app.id}`);
        batch.set(appRef, {
            ...app,
            patientId: `mock-${app.patientId}`,
            doctorId: `mock-${app.doctorId}`,
            createdAt: new Date().toISOString()
        });
    }

    await batch.commit();
}
