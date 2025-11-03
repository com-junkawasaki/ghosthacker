import "dotenv/config";
import { launchWithStorage, loginIfNeeded, openWork, openPartEditor, saveAndPublish, saveStorage, setTitleAndBody, readTitle, readBody } from "./wattpad";
import { findEpisodeParts, loadPart, sha256 } from "./content";

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

    const parts = await findEpisodeParts(process.cwd());
    console.log(`Discovered ${parts.length} English parts to process`);

    for (const part of parts) {
      const { title, body } = await loadPart(part.filePath);
      console.log(`→ Part#${part.index + 1} [EP${part.episode}-P${part.part}] : ${title}`);

      if (dryRun) {
        continue;
      }

      await openPartEditor(page, part.index);

      // Idempotency: skip if unchanged
      const curTitle = (await readTitle(page)) || "";
      const curBody = (await readBody(page)) || "";
      const newHash = await sha256(`${title}\n\n${body}`);
      const curHash = await sha256(`${curTitle}\n\n${curBody}`);
      if (newHash === curHash) {
        console.log("  = Skipped (no changes)");
      } else {
        await setTitleAndBody(page, title, body);
        await saveAndPublish(page);
      }

      // Return to work TOC to continue
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


