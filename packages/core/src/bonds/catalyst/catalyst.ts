// npx esrun .\packages\core\src\bonds\catalyst\catalyst.ts quote FPC0631

import { quoteCommand } from "./cli/quoteCommand";

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("No command provided. Supported: quote [symbol]");
}

switch (args[0]) {
  case 'quote':
    await quoteCommand(args[1]);
    break;
}
