
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AdminAuditLogAnomalyDetectionInputSchema = z.object({
  auditLogs: z
    .string()
    .describe(
      'A string containing recent audit log entries, each line representing a single log event.'
    ),
});

export type AdminAuditLogAnomalyDetectionInput = z.infer<typeof AdminAuditLogAnomalyDetectionInputSchema>;

const AdminAuditLogAnomalyDetectionOutputSchema = z.object({
  isAnomaly: z.boolean().describe('True if an anomaly or potential security breach is detected, false otherwise.'),
  anomalyDescription: z.string().describe('A detailed description of the detected anomaly, including what happened, why it is unusual, and potential implications.'),
});

export type AdminAuditLogAnomalyDetectionOutput = z.infer<typeof AdminAuditLogAnomalyDetectionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'adminAuditLogAnomalyDetectionPrompt',
  input: { schema: AdminAuditLogAnomalyDetectionInputSchema },
  output: { schema: AdminAuditLogAnomalyDetectionOutputSchema },
  prompt: `You are a highly skilled cybersecurity analyst specializing in healthcare systems. Your task is to analyze provided audit logs and identify any unusual access patterns, sensitive actions, or potential security breaches.

Focus on detecting:
- Logins from unexpected locations or times.
- Multiple failed login attempts for a single user or across multiple users.
- Unauthorized access attempts.
- Sensitive actions (e.g., deleting records, exporting patient data, changing prescriptions) performed by users who typically do not perform such actions, or at unusual times.
- Any other patterns that suggest a policy violation or a security incident.

Analyze the following audit logs carefully:
---
{{{auditLogs}}}
---

Based on your analysis, determine if an anomaly or potential security breach is present. Respond with a JSON object according to the output schema. If no anomaly is detected, set 'isAnomaly' to false and leave 'anomalyDescription' empty. If an anomaly is detected, set 'isAnomaly' to true and provide a detailed explanation of the anomaly in 'anomalyDescription'.`
});

const adminAuditLogAnomalyDetectionFlow = ai.defineFlow(
  {
    name: 'adminAuditLogAnomalyDetectionFlow',
    inputSchema: AdminAuditLogAnomalyDetectionInputSchema,
    outputSchema: AdminAuditLogAnomalyDetectionOutputSchema,
  },
  async (input: AdminAuditLogAnomalyDetectionInput) => {
    try {
      const { output } = await prompt(input);
      if (!output) {
        return { isAnomaly: false, anomalyDescription: "" };
      }
      return output;
    } catch (error) {
      console.error('Genkit Anomaly Detection Error:', error);
      return {
        isAnomaly: false,
        anomalyDescription: "Security analysis temporarily unavailable. Please check system logs manually."
      };
    }
  }
);

export async function adminAuditLogAnomalyDetection(
  input: AdminAuditLogAnomalyDetectionInput
): Promise<AdminAuditLogAnomalyDetectionOutput> {
  return adminAuditLogAnomalyDetectionFlow(input);
}
