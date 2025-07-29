# 🎙️ Medical Transcribe: Transcripción de Audio con IA

**Medical Transcribe** es una aplicación web de última generación diseñada para transcribir informes de radiología en audio a texto con alta precisión. Construida con un stack tecnológico moderno, esta herramienta no solo ofrece una interfaz de usuario limpia e intuitiva, sino que también implementa una arquitectura de backend robusta y resiliente para manejar archivos de audio de larga duración de manera eficiente.

<!-- ![GIF de Demostración de Medical Transcribe](https://placehold.co/800x400.png) -->
*Aquí puedes añadir un GIF que muestre el flujo de la aplicación: arrastrar un archivo, transcribir y ver el resultado.*

---

## ✨ Características Principales

- **Interfaz Moderna e Intuitiva:** Experiencia de usuario fluida con componentes de `shadcn/ui` y diseño responsivo.
- **Carga de Archivos Sencilla:** Soporte para arrastrar y soltar (`drag-and-drop`) múltiples archivos de audio.
- **Transcripción Potente con Genkit:** Utiliza los modelos de IA más avanzados de Google (`gemini-1.5-flash`) a través de Genkit para transcripciones rápidas y precisas.
- **Manejo Inteligente de Audio Largo:** Segmenta automáticamente los archivos de audio de más de 3 minutos en fragmentos más pequeños.
- **Procesamiento Secuencial y Resiliente:** Procesa los fragmentos de audio uno por uno, con pausas estratégicas, para evitar exceder los límites de la API y manejar la sobrecarga del servicio de manera elegante.
- **Gestión de Resultados:** Permite copiar al portapapeles o descargar la transcripción completa en un archivo `.txt`.
- **Autenticación Simulada:** Flujo de inicio de sesión y registro para una experiencia de aplicación completa.

---

## 🚀 Stack Tecnológico

Este proyecto fue construido con un enfoque en el rendimiento, la escalabilidad y la calidad del código, utilizando:

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Inteligencia Artificial:** [Genkit (Google AI)](https://firebase.google.com/docs/genkit)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes de UI:** [shadcn/ui](https://ui.shadcn.com/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Iconos:** [Lucide React](https://lucide.dev/)

---

## 🔧 Cómo Funciona: La Arquitectura de Transcripción

El verdadero desafío de esta aplicación era manejar audios de duración variable sin fallar. Así es como lo solucionamos:

1.  **Detección de Duración:** Al subir un audio, primero determinamos su duración.
2.  **Segmentación (Chunking):** Si el audio supera los 3 minutos, se divide en fragmentos más pequeños utilizando la librería `sox-audio`.
3.  **Procesamiento en Cola:** En lugar de enviar todos los fragmentos a la vez (lo que causaría errores de límite de tasa), el flujo de Genkit los procesa de manera **secuencial**.
4.  **Pausa Estratégica:** Se introduce un retardo de 2 segundos entre la transcripción de cada fragmento. Esta pausa es crucial para evitar el error `503 Service Unavailable` por sobrecarga del modelo de IA, garantizando una alta tasa de éxito incluso con audios muy largos.
5.  **Consolidación:** Finalmente, las transcripciones de todos los fragmentos se unen para formar el informe final completo.

Esta arquitectura convierte una simple llamada a la API en un proceso robusto y tolerante a fallos, capaz de manejar cargas de trabajo exigentes.

---

## 🛠️ Instalación y Ejecución Local

Para ejecutar este proyecto en tu máquina local, sigue estos pasos:

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/medical-transcribe.git
    cd medical-transcribe
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno:**
    - Renombra el archivo `.env.template` a `.env`.
    - Añade tu clave de API de Google AI en la variable `GEMINI_API_KEY`.
    ```
    GEMINI_API_KEY="TU_API_KEY_AQUÍ"
    ```

4.  **Ejecuta el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

¡Abre [http://localhost:9002](http://localhost:9002) en tu navegador para ver la aplicación en acción!

---

## 🔮 Posibles Mejoras a Futuro

- [ ] **Análisis de Entidades:** Implementar un segundo flujo de Genkit que analice el texto transcrito para extraer entidades médicas clave (ej. diagnósticos, anatomía, mediciones).
- [ ] **Historial de Transcripciones:** Conectar a Firebase Firestore para guardar las transcripciones de los usuarios y crear un historial consultable.
- [ ] **Streaming en Tiempo Real:** Utilizar WebSockets para mostrar la transcripción en tiempo real a medida que se procesa.
- [ ] **Autenticación Real:** Reemplazar la simulación con una implementación completa de Firebase Authentication.
