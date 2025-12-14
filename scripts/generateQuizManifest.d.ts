export function getQuizManifestPaths(
  repoRootOverride?: string
): {
  repoRoot: string;
  dataDir: string;
  outFile: string;
};

export function generateQuizManifest(options?: {
  repoRoot?: string;
}): Promise<void>;
