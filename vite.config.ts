import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateQuizManifest } from './scripts/generateQuizManifest.js'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const repoFromEnv = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const base =
    command === 'build' && process.env.GITHUB_PAGES === 'true' && repoFromEnv
      ? `/${repoFromEnv}/`
      : '/'

  return {
    base,
    plugins: [
      react(),
      {
        name: 'quiz-manifest-hmr',
        apply: 'serve',
        configureServer(server) {
          const repoRoot = path.dirname(fileURLToPath(import.meta.url))
          const dataDir = path.resolve(repoRoot, 'public', 'data')

        const isDataJson = (filePath: string) => {
          const normalized = path.resolve(filePath)
          return normalized.toLowerCase().endsWith('.json') && normalized.startsWith(dataDir)
        }

        let timer: NodeJS.Timeout | undefined
        const schedule = () => {
          if (timer) clearTimeout(timer)
          timer = setTimeout(async () => {
            try {
              await generateQuizManifest({ repoRoot })
              server.ws.send({
                type: 'custom',
                event: 'quiz-manifest-updated',
                data: { t: Date.now() },
              })
            } catch (err) {
              console.warn('[quiz-manifest-hmr] Failed to regenerate manifest', err)
            }
          }, 100)
        }

        // Initial generation (best-effort) so dev starts in sync.
        generateQuizManifest({ repoRoot }).catch((err: unknown) =>
          console.warn('[quiz-manifest-hmr] Initial manifest generation failed', err)
        )

        server.watcher.add(dataDir)
        server.watcher.on('add', (p) => isDataJson(p) && schedule())
        server.watcher.on('change', (p) => isDataJson(p) && schedule())
          server.watcher.on('unlink', (p) => isDataJson(p) && schedule())
        },
      },
    ],
  }
})
