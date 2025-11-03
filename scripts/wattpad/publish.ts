import "dotenv/config";
import { launchWithStorage, loginIfNeeded, openWork, createNewPart, saveAndPublish, saveStorage, setTitleAndBody, getExistingPartCount } from "./wattpad";
import { findEpisodeParts, loadPart } from "./content";
import { upsertPartMapping } from "./part-ids";

type CliFlags = { dryRun: boolean };

function getFlags(): CliFlags {
  const dryRun = process.argv.includes("--dry-run");
  return { dryRun };
}

async function main() {
  const { dryRun } = getFlags();
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

    const parts = await findEpisodeParts(process.cwd());
    console.log(`Discovered ${parts.length} English parts to process`);

    // Only create new parts for parts that don't exist yet
    const partsToCreate = parts.slice(existingPartCount);
    
    if (partsToCreate.length === 0) {
      console.log("All parts already exist on Wattpad. Nothing to do.");
      return;
    }

    console.log(`Creating ${partsToCreate.length} new part(s)...`);

    for (const part of partsToCreate) {
      const { title, body } = await loadPart(part.filePath);
      console.log(`→ Creating [EP${part.episode}-P${part.part}] : ${title}`);

      if (dryRun) {
        console.log("  (dry-run: would create and publish)");
        continue;
      }

      // Create new part
      const partId = await createNewPart(page, workId);

      // Set title and body
      await setTitleAndBody(page, title, body);

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


