import fs from "node:fs";
import path from "node:path";
import { parseEpisodeMarkdown } from "../lib/episode-parser";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log("Please provide a file path to an episode markdown file.");
    return;
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  console.log(`Processing ${absolutePath}...`);

  const contextPath = path.resolve(process.cwd(), "src/ontology/context.jsonld");
  const contextContent = fs.readFileSync(contextPath, "utf-8");
  const context = JSON.parse(contextContent);

  const content = fs.readFileSync(absolutePath, "utf-8");
  const parsedData = parseEpisodeMarkdown(content);

  const allNodes = [
    parsedData.episode,
    ...parsedData.acts,
    ...parsedData.scenes,
    ...parsedData.characters,
    ...parsedData.locations,
    ...parsedData.events,
    ...parsedData.concepts,
  ].filter(Boolean);

  const jsonld = {
    "@context": context["@context"],
    "@graph": allNodes,
  };

  const outputName = path.basename(filePath, ".md") + ".jsonld";
  const outputPath = path.resolve(path.dirname(absolutePath), outputName);
  
  fs.writeFileSync(outputPath, JSON.stringify(jsonld, null, 2));
  console.log(`Successfully generated JSON-LD at: ${outputPath}`);
}

main().catch(console.error);
