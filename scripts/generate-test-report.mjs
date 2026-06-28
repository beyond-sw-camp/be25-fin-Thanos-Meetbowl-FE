import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const testRoot = path.join(projectRoot, "test");
const reportDir = path.join(projectRoot, "build", "reports", "tests", "test");
const reportPath = path.join(reportDir, "index.html");
const summaryPath = path.join(reportDir, "summary.json");

function collectTestFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function parseTapOutput(stdout) {
  const lines = stdout.split(/\r?\n/);
  const tests = [];
  const summary = {
    tests: 0,
    pass: 0,
    fail: 0,
    skipped: 0,
    todo: 0,
    cancelled: 0,
    durationMs: 0,
  };
  let currentTest = null;

  for (const line of lines) {
    if (line.startsWith("# Subtest: ")) {
      continue;
    }

    const resultMatch = line.match(/^(ok|not ok)\s+\d+\s+-\s+(.+)$/);
    if (resultMatch) {
      currentTest = {
        name: resultMatch[2],
        status: resultMatch[1] === "ok" ? "passed" : "failed",
        durationMs: null,
      };
      tests.push(currentTest);
      continue;
    }

    const durationMatch = line.trim().match(/^duration_ms:\s+([\d.]+)$/);
    if (durationMatch && currentTest) {
      currentTest.durationMs = Number(durationMatch[1]);
      continue;
    }

    const summaryMatch = line.match(
      /^#\s+(tests|pass|fail|skipped|todo|cancelled|duration_ms)\s+(.+)$/
    );
    if (summaryMatch) {
      const key = summaryMatch[1];
      const value = Number(summaryMatch[2]);
      if (key === "duration_ms") {
        summary.durationMs = value;
      } else if (key === "tests") {
        summary.tests = value;
      } else {
        summary[key] = value;
      }
    }
  }

  return { tests, summary };
}

function runTestFile(testFile) {
  const relativePath = path.relative(projectRoot, testFile);
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-reporter", "tap", relativePath],
    {
      cwd: projectRoot,
      encoding: "utf8",
    }
  );

  if (result.error) {
    throw result.error;
  }

  const parsed = parseTapOutput(result.stdout);

  return {
    file: relativePath,
    suiteName: path.basename(testFile),
    tests: parsed.tests,
    summary: parsed.summary,
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function formatDuration(durationMs) {
  if (durationMs == null || Number.isNaN(durationMs)) {
    return "-";
  }

  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)} s`;
  }

  return `${Math.round(durationMs)} ms`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHtml(report) {
  const suitesHtml = report.suites
    .map((suite) => {
      const rows = suite.tests
        .map(
          (test) => `
            <tr>
              <td class="name">${escapeHtml(test.name)}</td>
              <td class="status ${test.status}">${escapeHtml(test.status)}</td>
              <td class="duration">${escapeHtml(formatDuration(test.durationMs))}</td>
            </tr>`
        )
        .join("");

      return `
        <section class="suite">
          <div class="suite-header">
            <div>
              <h2>${escapeHtml(suite.suiteName)}</h2>
              <p>${escapeHtml(suite.file)}</p>
            </div>
            <div class="suite-summary">
              <span>${suite.summary.tests} tests</span>
              <span>${escapeHtml(formatDuration(suite.summary.durationMs))}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Test case</th>
                <th>Status</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Test Results - Tests in 'meetbowl-fe'</title>
    <style>
      :root {
        color-scheme: light;
        --page-bg: #f6f8fb;
        --panel-bg: #ffffff;
        --line: #dfe6ee;
        --line-strong: #c8d3df;
        --text: #1f2937;
        --muted: #667085;
        --success: #2f9e44;
        --fail: #d94841;
        --accent: #8ce06f;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: var(--page-bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .page {
        max-width: 1240px;
        margin: 0 auto;
        padding: 32px 24px 64px;
      }

      .meta,
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .meta {
        font-size: 14px;
        color: var(--muted);
        margin-bottom: 24px;
      }

      .header-top {
        gap: 16px;
        margin-bottom: 8px;
      }

      h1 {
        margin: 0;
        font-size: 22px;
      }

      .summary-text {
        margin: 0 0 24px;
        font-size: 18px;
        font-weight: 700;
      }

      .summary-text .pass {
        color: var(--success);
      }

      .summary-panel {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 28px;
      }

      .summary-card {
        background: var(--panel-bg);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 16px 18px;
      }

      .summary-card .label {
        display: block;
        color: var(--muted);
        font-size: 13px;
        margin-bottom: 8px;
      }

      .summary-card .value {
        font-size: 28px;
        font-weight: 700;
      }

      .suite {
        background: var(--panel-bg);
        border: 1px solid var(--line);
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 18px;
      }

      .suite-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        padding: 18px 20px 18px 24px;
        border-left: 8px solid var(--accent);
      }

      .suite-header h2 {
        margin: 0 0 4px;
        font-size: 20px;
      }

      .suite-header p,
      .suite-summary {
        margin: 0;
        color: var(--muted);
        font-size: 13px;
      }

      .suite-summary {
        text-align: right;
        display: grid;
        gap: 4px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 12px 20px;
        border-top: 1px solid var(--line);
        vertical-align: top;
      }

      th {
        text-align: left;
        font-size: 13px;
        color: var(--muted);
        background: #fbfcfe;
      }

      td.name {
        width: 72%;
        font-weight: 600;
        color: #1458c0;
      }

      td.status,
      td.duration {
        width: 14%;
        white-space: nowrap;
        text-align: right;
      }

      .status.passed {
        color: var(--success);
        font-weight: 700;
      }

      .status.failed {
        color: var(--fail);
        font-weight: 700;
      }

      @media (max-width: 900px) {
        .summary-panel {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .suite-header,
        .meta,
        .header-top {
          display: block;
        }

        .suite-summary,
        td.status,
        td.duration {
          text-align: left;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <div class="meta">
        <span>${escapeHtml(report.generatedAt)}</span>
        <span>Test Results - Tests in 'meetbowl-fe'</span>
      </div>
      <div class="header-top">
        <h1>Tests in 'meetbowl-fe': ${report.summary.tests} total, <span class="pass">${report.summary.pass} passed</span></h1>
        <strong>${escapeHtml(formatDuration(report.summary.durationMs))}</strong>
      </div>
      <p class="summary-text">
        Frontend unit tests were executed file-by-file and rendered as an HTML report.
      </p>
      <section class="summary-panel">
        <article class="summary-card">
          <span class="label">Suites</span>
          <strong class="value">${report.suites.length}</strong>
        </article>
        <article class="summary-card">
          <span class="label">Tests</span>
          <strong class="value">${report.summary.tests}</strong>
        </article>
        <article class="summary-card">
          <span class="label">Passed</span>
          <strong class="value">${report.summary.pass}</strong>
        </article>
        <article class="summary-card">
          <span class="label">Duration</span>
          <strong class="value">${escapeHtml(formatDuration(report.summary.durationMs))}</strong>
        </article>
      </section>
      ${suitesHtml}
    </main>
  </body>
</html>`;
}

const suites = collectTestFiles(testRoot).map(runTestFile);
const summary = suites.reduce(
  (accumulator, suite) => {
    accumulator.tests += suite.summary.tests;
    accumulator.pass += suite.summary.pass;
    accumulator.fail += suite.summary.fail;
    accumulator.skipped += suite.summary.skipped;
    accumulator.todo += suite.summary.todo;
    accumulator.cancelled += suite.summary.cancelled;
    accumulator.durationMs += suite.summary.durationMs;
    return accumulator;
  },
  {
    tests: 0,
    pass: 0,
    fail: 0,
    skipped: 0,
    todo: 0,
    cancelled: 0,
    durationMs: 0,
  }
);

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  suites,
};

mkdirSync(reportDir, { recursive: true });
writeFileSync(summaryPath, JSON.stringify(report, null, 2));
writeFileSync(reportPath, buildHtml(report));

const failedSuite = suites.find((suite) => suite.exitCode !== 0);
if (failedSuite) {
  process.stderr.write(failedSuite.stderr || failedSuite.stdout);
  process.exit(failedSuite.exitCode);
}

process.stdout.write(`HTML report written to ${reportPath}\n`);
