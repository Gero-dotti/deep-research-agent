import { openai } from '@ai-sdk/openai';
import { generateObject, generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { Exa } from 'exa-js';
import 'dotenv/config';
import fs from 'fs';

const mainModel = openai('gpt-4o');

const exa = new Exa(process.env.EXA_API_KEY);

type searchResult = {
  title: string;
  url: string;
  content: string;
};

const searchWeb = async (query: string, limit: number = 3) => {
  const { results } = await exa.search(query, {
    numResults: limit,
  });
  return results.map(
    (r) =>
      ({
        title: r.title ?? r.url,
        url: r.url,
        content: r.text ?? '',
      }) as searchResult,
  );
};

const generateSearchQuery = async (query: string, n: number) => {
  const {
    object: { queries },
  } = await generateObject({
    model: mainModel,
    prompt: `Generate ${n} concise and relevant search queries based on the following query: "${query}"`,
    schema: z.object({
      queries: z.array(z.string()).length(n),
    }),
  });
  return queries;
};

const searchAndProcess = async (
  query: string,
  limit: number,
  accumulatedSources: searchResult[],
) => {
  const pendingSearchResults: searchResult[] = [];
  const finalSearchResults: searchResult[] = [];
  await generateText({
    model: mainModel,
    prompt: `Search the web for information about ${query}`,
    system:
      'You are a researcher. For each query, search the web and then evaluate if the results are relevant and will help answer the following query',
    stopWhen: stepCountIs(5),
    toolChoice: 'required',
    tools: {
      searchWeb: tool({
        description: 'Search the web for information about a given query',
        inputSchema: z.object({
          query: z.string().min(1),
        }),
        async execute({ query }) {
          const results = await searchWeb(query, limit);
          pendingSearchResults.push(...results);
          return results;
        },
      }),
      evaluate: tool({
        description: 'Evaluate the search results',
        inputSchema: z.object({}),
        async execute() {
          const pendingResult = pendingSearchResults.pop();
          if (!pendingResult) return 'No results to evaluate yet.';
          const { object: evaluation } = await generateObject({
            model: mainModel,
            prompt: `Evaluate whether the search results are relevant and will help answer the following query: ${query}. If the page already exists in the existing results, mark it as irrelevant.
 
            <search_results>
            ${JSON.stringify(pendingResult)}
            </search_results>
 
            <existing_results>
            ${JSON.stringify(accumulatedSources.map((result) => result.url))}
            </existing_results>
 
            `,
            output: 'enum',
            enum: ['relevant', 'irrelevant'],
          });
          if (evaluation === 'relevant') {
            finalSearchResults.push(pendingResult);
          }
          console.log('Found:', pendingResult.url);
          console.log('Evaluation completed:', evaluation);
          return evaluation === 'irrelevant'
            ? 'Search results are irrelevant. Please search again with a more specific query.'
            : 'Search results are relevant. End research for this query.';
        },
      }),
    },
  });
  return finalSearchResults;
};

const generateLearnings = async (query: string, searchResult: searchResult) => {
  const { object } = await generateObject({
    model: mainModel,
    prompt: `The user is searching for "${query}". The following search were deemed relevant.
    Generate a learning and follow-up question from the following search result:
    
      <search_result>
      ${JSON.stringify(searchResult)}
      </search_result>
    
    `,
    schema: z.object({
      learning: z.string(),
      followUpQuestions: z.array(z.string()),
    }),
  });

  return object;
};

type learning = {
  learning: string;
  followUpQuestions: string[];
};

type Research = {
  query: string | undefined;
  queries: string[];
  searchResults: searchResult[];
  learnings: learning[];
  completedQueries: string[];
};

const accumulatedResearch: Research = {
  query: undefined,
  queries: [],
  searchResults: [],
  learnings: [],
  completedQueries: [],
};

const deepResearch = async (prompt: string, depth: number = 1, breadth: number = 3) => {
  if (!accumulatedResearch.query) {
    accumulatedResearch.query = prompt;
  }

  if (depth === 0) {
    return accumulatedResearch;
  }

  const queries = await generateSearchQuery(prompt, breadth);
  accumulatedResearch.queries = [...new Set([...accumulatedResearch.queries, ...queries])];

  for (const query of queries) {
    console.log(`Searching the web for: ${query}`);
    const searchResults = await searchAndProcess(query, breadth, accumulatedResearch.searchResults);
    accumulatedResearch.searchResults.push(...searchResults);
    if (!accumulatedResearch.completedQueries.includes(query))
      accumulatedResearch.completedQueries.push(query);
    for (const searchResult of searchResults) {
      console.log(`Processing search result: ${searchResult.url}`);
      const learnings = await generateLearnings(query, searchResult);
      accumulatedResearch.learnings.push(learnings);

      const newQuery = `Overall research goal: ${prompt}.
        Previous search queries: ${accumulatedResearch.completedQueries.join(', ')}.
        Follow-up question: ${learnings.followUpQuestions.join(', ')}.`;
      await deepResearch(newQuery, depth - 1, Math.ceil(breadth / 2));
    }
  }
  return accumulatedResearch;
};

const SYSTEM_PROMPT = `You are an expert researcher. Today is ${new Date().toISOString()}. Follow these instructions when responding:
  - You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
  - The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
  - Be highly organized.
  - Suggest solutions that I didn't think about.
  - Be proactive and anticipate my needs.
  - Treat me as an expert in all subject matter.
  - Mistakes erode my trust, so be accurate and thorough.
  - Provide detailed explanations, I'm comfortable with lots of detail.
  - Value good arguments over authorities, the source is irrelevant.
  - Consider new technologies and contrarian ideas, not just the conventional wisdom.
  - You may use high levels of speculation or prediction, just flag it for me.
  - Use Markdown formatting.`;

const generateReport = async (research: Research) => {
  const { text } = await generateText({
    model: openai('o3-mini'),
    system: SYSTEM_PROMPT,
    prompt:
      'Generate a report based on the following research data:\n\n' +
      JSON.stringify(research, null, 2),
  });
  return text;
};

const main = async () => {
  const research = await deepResearch(
    'Analyze the potential impacts of quantum computing on cybersecurity over the next decade.',
  );
  console.log('Research completed');
  console.log('Generating the report in a md file...');
  const report = await generateReport(research);
  console.log('Report generated as report.md');
  fs.writeFileSync('report.md', report);
};

main();
