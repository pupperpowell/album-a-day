#!/usr/bin/env bun

import { spawn } from "bun";

// Test configuration
const testConfig = {
  pattern: "./tests/**/*.test.ts",
  setupFile: "./tests/setup.ts",
  timeout: 10000,
  verbose: true,
};

// Parse command line arguments
const args = process.argv.slice(2);
const isWatchMode = args.includes("--watch");
const isCoverageMode = args.includes("--coverage");
const specificTest = args.find(arg => arg.startsWith("--test="))?.split("=")[1];

// Build the test command
let testCommand = ["bun", "test"];

if (specificTest) {
  testCommand.push(specificTest);
} else {
  testCommand.push(testConfig.pattern);
}

if (isWatchMode) {
  testCommand.push("--watch");
}

if (isCoverageMode) {
  testCommand.push("--coverage");
}

if (testConfig.verbose) {
  testCommand.push("--verbose");
}

testCommand.push("--timeout", testConfig.timeout.toString());

// Set environment variables for testing
Bun.env.NODE_ENV = "test";
Bun.env.REDIS_URL = "redis://localhost:6379"; // Mock will handle this

console.log("🧪 Running authentication route tests...");
console.log(`📁 Test pattern: ${specificTest || testConfig.pattern}`);
console.log(`⚙️  Environment: ${process.env.NODE_ENV}`);
console.log("");

// Run the tests
const testProcess = spawn({
  cmd: testCommand,
  stdout: "inherit",
  stderr: "inherit",
});

const exitCode = await testProcess.exited;

if (exitCode === 0) {
  console.log("");
  console.log("✅ All tests passed!");
} else {
  console.log("");
  console.log("❌ Some tests failed!");
  process.exit(exitCode);
}