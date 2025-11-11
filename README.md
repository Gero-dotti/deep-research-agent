# Deep Research Agent

This project implements an **automatic research agent** built with the **Vercel AI SDK** and **TypeScript**.  
Its goal is to automate web search, evaluation, and synthesis of information, producing detailed research reports in Markdown format.

## Context

The code is based on the official Vercel documentation:  
[https://aie-feb-25.vercel.app/docs/deep-research](https://aie-feb-25.vercel.app/docs/deep-research)

I followed the structure and logic from the guide, making **minor adjustments** to adapt the flow and output formatting while preserving the original architecture.

## Technologies Used

- **TypeScript**
- **Node.js**
- **Vercel AI SDK**
- **OpenAI API**
- **Exa Search API**
- **Zod**
- **Dotenv**
- **fs (File System)**

## How It Works

The main file is `src/index.ts`, which:
1. Generates relevant subqueries for an initial research question.  
2. Uses the Exa API to fetch web results.  
3. Evaluates the relevance of each result.  
4. Extracts insights and generates follow-up questions from each source.  
5. Iterates recursively until the defined research depth is reached.  
6. Produces a **final report (`report.md`)** summarizing the findings.

## Running the Project

1. Install dependencies:
   ```bash
   npm install