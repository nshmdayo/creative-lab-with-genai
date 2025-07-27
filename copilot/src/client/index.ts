#!/usr/bin/env node

import { GoogleAICreativeCLI } from './cli.js';

/**
 * Entry point for Google AI Creative Tools CLI
 */
async function main() {
  const cli = new GoogleAICreativeCLI();
  await cli.start();
}

main().catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
});
