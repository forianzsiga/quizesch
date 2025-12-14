import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getQuizManifestPaths(repoRootOverride) {
  const repoRoot = repoRootOverride ? path.resolve(repoRootOverride) : path.resolve(__dirname, '..');
  return {
    repoRoot,
    dataDir: path.join(repoRoot, 'public', 'data'),
    outFile: path.join(repoRoot, 'public', 'quiz-manifest.json'),
  };
}

function inferTagsFromFileName(fileName) {
  const base = fileName.replace(/\.json$/i, '');

  const yearMatch = base.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : undefined;

  // Very lightweight heuristics based on your existing naming scheme.
  let type;
  const lower = base.toLowerCase();
  if (/(^|_)ppzh($|_)/.test(lower)) type = 'PPZH';
  else if (/(^|_)pzh($|_)/.test(lower)) type = 'PZH';
  else if (/(^|_)zh($|_)/.test(lower)) type = 'ZH';
  else if (lower.includes('vizsga')) type = 'Vizsga';

  return {
    subject: 'Untagged',
    type: type ?? 'Untagged',
    year,
  };
}

function normalizeTags(tags, fileName) {
  const inferred = inferTagsFromFileName(fileName);
  const safe = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

  return {
    subject: safe(tags?.subject) ?? inferred.subject,
    type: safe(tags?.type) ?? inferred.type,
    year: safe(tags?.year) ?? inferred.year,
  };
}

export async function generateQuizManifest(options = {}) {
  const { repoRoot, dataDir, outFile } = getQuizManifestPaths(options.repoRoot);

  const dirEntries = await fs.readdir(dataDir, { withFileTypes: true });
  const jsonFiles = dirEntries
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.json'))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, 'en'));

  const quizzes = [];
  const tagSets = {
    subject: new Set(),
    type: new Set(),
    year: new Set(),
  };

  for (const fileName of jsonFiles) {
    const fullPath = path.join(dataDir, fileName);

    let parsed;
    try {
      const raw = await fs.readFile(fullPath, 'utf8');
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn(`[generateQuizManifest] Skipping invalid JSON: ${fileName}`);
      continue;
    }

    const tags = normalizeTags(parsed?.tags, fileName);

    quizzes.push({
      fileName,
      tags,
    });

    tagSets.subject.add(String(tags.subject));
    tagSets.type.add(String(tags.type));
    tagSets.year.add(String(tags.year));
  }

  // Keep the existing manifest shape for compatibility.
  const manifest = {
    quizzes,
    availableTags: {
      subject: Array.from(tagSets.subject).sort(),
      type: Array.from(tagSets.type).sort(),
      year: Array.from(tagSets.year)
        .sort((a, b) => {
          // Sort years descending when numeric; keep other values last.
          const na = Number(a);
          const nb = Number(b);
          const aNum = Number.isFinite(na) && String(na) === a;
          const bNum = Number.isFinite(nb) && String(nb) === b;
          if (aNum && bNum) return nb - na;
          if (aNum) return -1;
          if (bNum) return 1;
          return a.localeCompare(b, 'en');
        }),
    },
  };

  await fs.writeFile(outFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[generateQuizManifest] Wrote ${quizzes.length} entries to ${path.relative(repoRoot, outFile)}`);
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  await generateQuizManifest();
}
