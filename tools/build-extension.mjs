import { createEs2015LinkerPlugin } from '@angular/compiler-cli/linker/babel';
import { transformAsync } from '@babel/core';
import tailwindcss from '@tailwindcss/postcss';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path, { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'dist', 'devtab');
const outTs = join(root, 'out-tsc', 'app');

await rm(outDir, { recursive: true, force: true });
await rm(outTs, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await run(join(root, 'node_modules', '.bin', 'ngc'), ['-p', 'tsconfig.app.json']);

await build({
  entryPoints: [join(outTs, 'main.js')],
  outfile: join(outDir, 'main.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  plugins: [angularLinkerPlugin()],
  minify: true,
  sourcemap: false,
  define: {
    ngDevMode: 'false',
    ngJitMode: 'false',
    ngI18nClosureMode: 'false',
  },
});

const cssInput = join(root, 'src', 'styles.css');
const css = await readFile(cssInput, 'utf8');
const processed = await postcss([tailwindcss()]).process(css, {
  from: cssInput,
  to: join(outDir, 'styles.css'),
});

await writeFile(join(outDir, 'styles.css'), processed.css);
await writeFile(
  join(outDir, 'newtab.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>DevTab</title>
    <base href="./" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/x-icon" href="icons/favicon.ico" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <dt-root></dt-root>
    <script type="module" src="main.js"></script>
  </body>
</html>
`,
);

await cp(join(root, 'public'), outDir, { recursive: true });

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with ${code}`));
    });

    child.on('error', reject);
  });
}

function angularLinkerPlugin() {
  const linkerPlugin = createEs2015LinkerPlugin({
    linkerJitMode: false,
    sourceMapping: false,
    logger: {
      level: 1,
      debug: () => undefined,
      info: () => undefined,
      warn: console.warn,
      error: console.error,
    },
    fileSystem: {
      resolve: path.resolve,
      exists: fs.existsSync,
      dirname: path.dirname,
      relative: path.relative,
      readFile: fs.readFileSync,
    },
  });

  return {
    name: 'angular-linker',
    setup(buildContext) {
      buildContext.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
        const code = await readFile(args.path, 'utf8');

        if (!code.includes('ɵɵngDeclare')) {
          return null;
        }

        const result = await transformAsync(code, {
          filename: args.path,
          inputSourceMap: false,
          sourceMaps: false,
          compact: false,
          configFile: false,
          babelrc: false,
          browserslistConfigFile: false,
          plugins: [linkerPlugin],
        });

        return {
          contents: result?.code ?? code,
          loader: 'js',
        };
      });
    },
  };
}
