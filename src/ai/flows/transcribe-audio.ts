'use server';

/**
 * @fileOverview This file defines a Genkit flow for transcribing audio recordings of radiology reports into text.
 *
 * - transcribeAudio - A function that handles the audio transcription process.
 * - TranscribeAudioInput - The input type for the transcribeAudio function, which includes the audio data URI.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function, which includes the transcribed text.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio recording of a radiology report, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcribedText: z
    .string()
    .describe('The transcribed text from the audio recording.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(
  input: TranscribeAudioInput
): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlow(input);
}

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async input => {
    const prompt = {
      prompt: `You are an expert medical transcriptionist. Please transcribe the following audio recording of a radiology report into text.\n\nAudio: {{media url=audioDataUri}}`,
      input: input,
    };

    try {
      // First attempt with the primary model
      const response = await ai.generate({
        model: 'gemini-1.5-flash-latest',
        ...prompt,
        output: {
          schema: TranscribeAudioOutputSchema,
        },
      });
      return response.output!;
    } catch (e: any) {
      // If the primary model fails (e.g., is overloaded), try the fallback model.
      console.log(
        'Primary model failed, attempting transcription with fallback model.',
        e
      );
      const response = await ai.generate({
        model: 'gemini-1.5-pro-latest',
        ...prompt,
        output: {
          schema: TranscribeAudioOutputSchema,
        },
      });
      return response.output!;
    }
  }
);
