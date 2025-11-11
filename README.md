# Deep Research Agent

Este proyecto implementa un **agente de investigación automática** construido con el **AI SDK de Vercel** y **TypeScript**.  
El objetivo es automatizar la búsqueda, evaluación y síntesis de información desde la web, generando reportes detallados en formato Markdown.

## Contexto

El código está basado en la guía oficial de Vercel publicada en 
[https://aie-feb-25.vercel.app/docs/deep-research](https://aie-feb-25.vercel.app/docs/deep-research)

Seguí la estructura propuesta en esa documentación y realicé **cambios menores** para ajustar el flujo y formato de salida, manteniendo la lógica y arquitectura original.

## Tecnologías utilizadas

- **TypeScript**
- **Node.js**
- **Vercel AI SDK**
- **OpenAI API**
- **Exa Search API**
- **Zod**
- **Dotenv**
- **fs (File System)**

## Funcionamiento general

El archivo principal es `src/index.ts`, el cual:
1. Genera subconsultas de búsqueda relevantes para una pregunta inicial.
2. Usa la API de Exa para obtener resultados web.
3. Evalúa la relevancia de cada resultado.
4. Genera aprendizajes y nuevas preguntas a partir de cada fuente.
5. Itera recursivamente hasta completar la profundidad definida.
6. Produce un **informe final (`report.md`)** con los hallazgos organizados.

## Ejecución

1. Instala las dependencias:
   ```bash
   npm install