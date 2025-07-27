#!/usr/bin/env node

import { GoogleAICreativeCLI } from './cli.js';

/**
 * Google AI Creative Tools CLI のエントリーポイント
 */
async function main() {
  const cli = new GoogleAICreativeCLI();
  await cli.start();
}

main().catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
});
