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
import * as fs from 'fs/promises';
import * as path from 'path';
import {Reader} from 'wav';
import {v4 as uuidv4} from 'uuid';
import Sox from 'sox-audio';

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

const transcribePrompt = ai.definePrompt({
  name: 'transcribePrompt',
  input: {schema: TranscribeAudioInputSchema},
  output: {schema: TranscribeAudioOutputSchema},
  prompt: `You are an expert medical transcriptionist. Please transcribe the following audio recording of a radiology report into text.

Audio: {{media url=audioDataUri}}`,
});

const MAX_DURATION_SECONDS = 180; // 3 minutes

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async input => {
    const {audioDataUri} = input;
    const [header, data] = audioDataUri.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1];
    const fileExtension = mimeType?.split('/')[1] || 'tmp';
    const buffer = Buffer.from(data, 'base64');

    const tempDir = path.join('/tmp', 'audio-chunks');
    await fs.mkdir(tempDir, {recursive: true});

    const tempFilePath = path.join(tempDir, `${uuidv4()}.${fileExtension}`);
    await fs.writeFile(tempFilePath, buffer);

    let duration = 0;
    try {
      const reader = new Reader();
      const fileStream = require('fs').createReadStream(tempFilePath);
      await new Promise((resolve, reject) => {
        reader.on('format', format => {
          duration = format.duration;
          resolve(undefined);
        });
        reader.on('error', err => {
          console.error('Error reading wav format:', err);
          // Can't determine duration, proceed as if it's short
          resolve(undefined);
        });
        fileStream.pipe(reader);
      });
    } catch (e) {
      console.error("Could not determine audio duration, assuming it's short.", e);
      duration = 0; // Assume it's a short audio
    }

    if (duration <= MAX_DURATION_SECONDS) {
      // Audio is short, transcribe directly
      const {output} = await transcribePrompt(input, {
        model: 'googleai/gemini-1.5-flash-latest',
      });
      await fs.unlink(tempFilePath).catch(console.error);
      return output!;
    }

    // Audio is long, chunk it
    console.log(`Audio is long (${duration}s), chunking...`);
    const chunkPromises: Promise<string>[] = [];
    const numChunks = Math.ceil(duration / MAX_DURATION_SECONDS);

    for (let i = 0; i < numChunks; i++) {
      const startTime = i * MAX_DURATION_SECONDS;
      const chunkPath = path.join(
        tempDir,
        `${uuidv4()}-chunk-${i}.${fileExtension}`
      );

      const sox = new Sox();
      sox.input(tempFilePath);
      sox.output(chunkPath);
      sox.outputFileType(fileExtension);
      sox.trim(startTime, MAX_DURATION_SECONDS);
      
      const chunkPromise = new Promise<string>((resolve, reject) => {
        sox.on('error', reject);
        sox.on('end', async () => {
          try {
            const chunkData = await fs.readFile(chunkPath);
            const chunkDataUri = `data:${mimeType};base64,${chunkData.toString(
              'base64'
            )}`;
            const {output} = await transcribePrompt(
              {audioDataUri: chunkDataUri},
              {model: 'googleai/gemini-1.5-flash-latest'}
            );
            await fs.unlink(chunkPath).catch(console.error);
            resolve(output!.transcribedText);
          } catch (e) {
            reject(e);
          }
        });
        sox.run();
      });
      chunkPromises.push(chunkPromise);
    }

    const transcribedChunks = await Promise.all(chunkPromises);
    await fs.unlink(tempFilePath).catch(console.error);
    
    return {
      transcribedText: transcribedChunks.join('\n\n'),
    };
  }
);
