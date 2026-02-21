/**
 * Download Salamander Grand Piano samples from the Tone.js CDN.
 * Saves MP3 files to public/samples/piano/ for use with Tone.Sampler.
 *
 * Usage:
 *   npm run download:samples
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEST_DIR = path.resolve(__dirname, '../public/samples/piano');
const BASE_URL = 'https://tonejs.github.io/audio/salamander/';

// Salamander filenames covering the counterpoint range (A1–C6).
// Tone.js uses 'Ds' for D# and 'Fs' for F# in filenames.
const SAMPLE_FILES = [
  'A1.mp3',
  'C2.mp3', 'Ds2.mp3', 'Fs2.mp3',
  'A2.mp3',
  'C3.mp3', 'Ds3.mp3', 'Fs3.mp3',
  'A3.mp3',
  'C4.mp3', 'Ds4.mp3', 'Fs4.mp3',
  'A4.mp3',
  'C5.mp3', 'Ds5.mp3', 'Fs5.mp3',
  'A5.mp3',
  'C6.mp3',
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) {
      console.log(`  skip  ${path.basename(destPath)} (already exists)`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(destPath);

    const request = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          reject(new Error(`HTTP ${res.statusCode} for ${targetUrl}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`  ✓     ${path.basename(destPath)}`);
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

async function main() {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  console.log(`Downloading ${SAMPLE_FILES.length} Salamander piano samples to:\n  ${DEST_DIR}\n`);

  let downloaded = 0;
  let skipped = 0;
  const errors = [];

  for (const filename of SAMPLE_FILES) {
    const url = `${BASE_URL}${filename}`;
    const dest = path.join(DEST_DIR, filename);
    const existed = fs.existsSync(dest);
    try {
      await downloadFile(url, dest);
      if (existed) skipped++;
      else downloaded++;
    } catch (err) {
      errors.push({ filename, err });
      console.error(`  ✗     ${filename}: ${err.message}`);
    }
  }

  console.log(`\nDone. ${downloaded} downloaded, ${skipped} skipped, ${errors.length} failed.`);
  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
