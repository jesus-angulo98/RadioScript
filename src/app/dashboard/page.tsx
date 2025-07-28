"use client";

import { useState, useMemo, useCallback, useRef, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AudioWaveform,
  Check,
  ClipboardCopy,
  Download,
  FileAudio,
  Loader2,
  LogOut,
  UploadCloud,
  X,
} from "lucide-react";
import { transcribeAudio } from "@/ai/flows/transcribe-audio";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Transcription = {
  fileName: string;
  text: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisclaimerChecked, setIsDisclaimerChecked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles).filter(
        (file) => file.type.startsWith("audio/") && !files.some((f) => f.name === file.name)
      );
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };
  
  const removeFile = (fileName: string) => {
    setFiles(files.filter((file) => file.name !== fileName));
  };

  const fileToDataUri = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2); // Short beep
    } catch (e) {
      console.error("Could not play sound:", e);
    }
  };

  const handleTranscribe = async () => {
    if (files.length === 0 || !isDisclaimerChecked) return;
    setIsLoading(true);
    setTranscriptions([]);

    try {
      const results: Transcription[] = [];
      for (const file of files) {
        const audioDataUri = await fileToDataUri(file);
        const result = await transcribeAudio({ audioDataUri });
        results.push({ fileName: file.name, text: result.transcribedText });
      }
      setTranscriptions(results);
      playCompletionSound();
    } catch (error) {
      console.error("Transcription error:", error);
      toast({
        variant: "destructive",
        title: "Error de Transcripción",
        description:
          "No se pudo transcribir el audio. Por favor, inténtalo de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fullTranscriptionText = useMemo(() => {
    return transcriptions
      .map((t) => `--- Transcripción de: ${t.fileName} ---\n\n${t.text}`)
      .join("\n\n\n");
  }, [transcriptions]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullTranscriptionText);
    toast({
      title: "Copiado",
      description: "El texto de la transcripción ha sido copiado.",
      action: <Check className="h-5 w-5 text-green-500" />,
    });
  };

  const handleDownload = () => {
    const blob = new Blob([fullTranscriptionText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "radioscript_transcripcion.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleDragEvents = (e: DragEvent<HTMLDivElement>, drag: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(drag);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <AudioWaveform className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold">RadioScript</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Cerrar Sesión</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">
                Espacio de Transcripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="default" className="bg-accent/30">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>¡Aviso Importante!</AlertTitle>
                <AlertDescription>
                  RadioScript es una demostración. Los archivos de audio y las transcripciones NO se guardan y se perderán al salir o refrescar la página.
                </AlertDescription>
              </Alert>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disclaimer"
                  checked={isDisclaimerChecked}
                  onCheckedChange={(checked) => setIsDisclaimerChecked(!!checked)}
                />
                <Label htmlFor="disclaimer" className="leading-snug text-muted-foreground">
                  Entiendo que esta es una plataforma de demostración y mis datos no serán almacenados.
                </Label>
              </div>

              <Separator />

              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-300",
                  "hover:border-primary hover:bg-primary/5",
                  isDragging && "border-primary bg-primary/10",
                  !isDisclaimerChecked && "bg-muted/50 cursor-not-allowed opacity-60"
                )}
                onClick={() => isDisclaimerChecked && fileInputRef.current?.click()}
                onDragEnter={(e) => isDisclaimerChecked && handleDragEvents(e, true)}
                onDragLeave={(e) => isDisclaimerChecked && handleDragEvents(e, false)}
                onDragOver={(e) => isDisclaimerChecked && e.preventDefault()}
                onDrop={(e) => {
                  handleDragEvents(e, false);
                  if (isDisclaimerChecked) handleFileChange(e.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files)}
                  disabled={!isDisclaimerChecked}
                />
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-semibold text-primary">
                  Arrastra y suelta tus archivos de audio aquí
                </p>
                <p className="text-sm text-muted-foreground">o haz clic para seleccionar (Máx 10MB por archivo)</p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Archivos seleccionados:</h3>
                  <ul className="space-y-2">
                    {files.map((file, index) => (
                      <li key={index} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                        <div className="flex items-center gap-2 text-sm">
                          <FileAudio className="h-5 w-5 text-primary" />
                          <span>{file.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(file.name)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <Button
                size="lg"
                className="w-full text-lg gap-2"
                onClick={handleTranscribe}
                disabled={!isDisclaimerChecked || files.length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Transcribiendo...
                  </>
                ) : (
                  "Transcribir Audio(s)"
                )}
              </Button>
            </CardContent>
          </Card>
          
          {(isLoading || transcriptions.length > 0) && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Resultados de la Transcripción</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading && (
                   <div className="flex justify-center items-center p-8">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                   </div>
                )}
                {transcriptions.length > 0 && !isLoading && (
                  <div className="space-y-4">
                     <div className="flex gap-2">
                       <Button onClick={handleCopy}><ClipboardCopy className="mr-2 h-4 w-4" /> Copiar Texto</Button>
                       <Button onClick={handleDownload} variant="outline"><Download className="mr-2 h-4 w-4" /> Descargar (.txt)</Button>
                     </div>
                     <Textarea
                        value={fullTranscriptionText}
                        readOnly
                        placeholder="Aquí aparecerá el texto transcrito..."
                        className="min-h-[300px] text-base bg-white"
                      />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
