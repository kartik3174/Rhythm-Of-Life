
'use client';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function writeAuditLog(
    db: any,
    userId: string,
    userName: string,
    action: string,
    details: string,
    severity: 'low' | 'medium' | 'high' = 'low'
) {
    try {
        await addDoc(collection(db, 'audit_logs'), {
            userId,
            userName,
            action,
            details,
            severity,
            timestamp: serverTimestamp(),
        });
    } catch (err) {
        console.error('Audit log write failed:', err);
    }
}
