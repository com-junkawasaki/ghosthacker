import "dotenv/config";
import { launchWithStorage, loginIfNeeded, openWork, createNewPart, saveAndPublish, saveStorage, setTitleAndBody, getExistingPartCount, getFirstExistingPartId, readTitle, readBody } from "./wattpad";
import { findEpisodeParts, loadPart, loadEpisodeNames } from "./content";
import { upsertPartMapping } from "./part-ids";

type CliFlags = { dryRun: boolean; limit?: number };

function getFlags(): CliFlags {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  return { dryRun, limit };
}

async function main() {
  const { dryRun, limit } = getFlags();
  const email = process.env.WATTPAD_EMAIL ?? "";
  const password = process.env.WATTPAD_PASSWORD ?? "";
  const workId = process.env.WATTPAD_WORK_ID ?? "402848261";
  if (!email || !password) {
    console.error("Missing WATTPAD_EMAIL or WATTPAD_PASSWORD in env");
    process.exit(1);
  }

  const { browser, context, page } = await launchWithStorage();
  try {
    await loginIfNeeded(page, email, password);
    await saveStorage(context);
    await openWork(page, workId);

    // Get count of existing parts on Wattpad
    const existingPartCount = await getExistingPartCount(page, workId);
    
    // Get first existing part ID to use as editor entry point
    const firstExistingPartId = await getFirstExistingPartId(page, workId);
    console.log(`Using existing part ID ${firstExistingPartId} as editor entry point`);

    const parts = await findEpisodeParts(process.cwd());
    console.log(`Discovered ${parts.length} English parts to process`);

    // Load episode names for title enhancement
    const episodeNames = await loadEpisodeNames(process.cwd());

    // Only create new parts for parts that don't exist yet
    let partsToCreate = parts.slice(existingPartCount);
    
    // Apply limit if specified
    if (limit !== undefined && limit > 0) {
      partsToCreate = partsToCreate.slice(0, limit);
      console.log(`Limiting to ${limit} part(s) for testing`);
    }
    
    if (partsToCreate.length === 0) {
      console.log("All parts already exist on Wattpad. Nothing to do.");
      return;
    }

    console.log(`Creating ${partsToCreate.length} new part(s)...`);

    for (const part of partsToCreate) {
      const { title: originalTitle, body } = await loadPart(part.filePath);
      
      // Add episode title to part title if this is the first part of an episode
      let title = originalTitle;
      if (part.part === 1) {
        const episodeTitle = episodeNames.get(part.episode);
        if (episodeTitle) {
          // Format: "EP1: The Loneliness of a Physicist - [Original Title]"
          title = `EP${part.episode}: ${episodeTitle} - ${originalTitle}`;
        }
      }
      
      console.log(`→ Creating [EP${part.episode}-P${part.part}] : ${title}`);

      if (dryRun) {
        console.log("  (dry-run: would create and publish)");
        continue;
      }

      // Create new part (use existing part ID as entry point, pass credentials for re-login if needed)
      const partId = await createNewPart(page, workId, firstExistingPartId || undefined, email, password);

      // Set title and body
      await setTitleAndBody(page, title, body);
      
      // Verify title and body were set correctly
      const actualTitle = await readTitle(page);
      const actualBody = await readBody(page);
      
      if (actualTitle.trim() !== title.trim()) {
        console.warn(`  ⚠ Title mismatch: expected "${title}", got "${actualTitle}"`);
      } else {
        console.log(`  ✓ Title verified: "${actualTitle}"`);
      }
      
      // Compare body content (allow for whitespace differences)
      const expectedBodyTrimmed = body.trim().replace(/\s+/g, " ");
      const actualBodyTrimmed = actualBody.trim().replace(/\s+/g, " ");
      const bodyMatchRatio = actualBodyTrimmed.length > 0 
        ? Math.min(expectedBodyTrimmed.length, actualBodyTrimmed.length) / Math.max(expectedBodyTrimmed.length, actualBodyTrimmed.length)
        : 0;
      
      if (bodyMatchRatio < 0.8) {
        console.warn(`  ⚠ Body content mismatch: expected ${expectedBodyTrimmed.length} chars, got ${actualBodyTrimmed.length} chars (match ratio: ${(bodyMatchRatio * 100).toFixed(1)}%)`);
        console.warn(`  First 100 chars of expected: "${expectedBodyTrimmed.substring(0, 100)}"`);
        console.warn(`  First 100 chars of actual: "${actualBodyTrimmed.substring(0, 100)}"`);
      } else {
        console.log(`  ✓ Body verified: ${actualBodyTrimmed.length} characters (match ratio: ${(bodyMatchRatio * 100).toFixed(1)}%)`);
      }

      // Publish
      await saveAndPublish(page);
      console.log(`  ✓ Published (ID: ${partId})`);

      // Save part ID mapping to JSON-LD
      await upsertPartMapping(part.episode, part.part, partId);

      // Return to myworks page for next iteration
      await openWork(page, workId);
    }

    console.log("Done.");
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


