import fs from 'fs';
import path from 'path';
import puppeteer, { Browser } from 'puppeteer';

import { reportRepository } from './repository';

const relationOne = <T>(value: T | T[] | null | undefined): T | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const formatDuration = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs}h ${mins}m ${secs}s`;
};

const parseBool = (value: string | string[] | undefined, fallback: boolean) => {
  if (Array.isArray(value)) return value[0] === 'true';
  if (typeof value === 'string') return value === 'true';
  return fallback;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString();
};

const resolveChromeExecutable = () => {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) ?? undefined;
};

const buildDailyActivityPdfHtml = (params: {
  rows: Array<Record<string, string>>;
  columns: Array<{ key: string; label: string }>;
  submittedDate: string;
  logoDataUrl?: string;
}) => {
  const { rows, columns, submittedDate, logoDataUrl } = params;

  const headerLogo = logoDataUrl
    ? `<img class="logo" src="${logoDataUrl}" alt="Company Logo" />`
    : `<div class="logo-placeholder"></div>`;

  const headerHtml = `
    <div class="report-header">
      <div class="header-left">${headerLogo}</div>
      <div class="header-center">Daily Activity Report</div>
      <div class="header-right">Submitted Date: ${escapeHtml(submittedDate)}</div>
    </div>
  `;

  const headCells = columns
    .map((col) => `<th>${escapeHtml(col.label)}</th>`)
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((col) => {
          const value = (row as Record<string, any>)[col.key];
          return `<td>${escapeHtml(value ?? '-')}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page {
            size: A4;
            margin: 18mm 14mm 18mm 14mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: "Arial", sans-serif;
            color: #111827;
            margin: 0;
          }
          .report-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 14px;
          }
          .header-left,
          .header-right {
            width: 30%;
          }
          .header-center {
            width: 40%;
            text-align: center;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.4px;
          }
          .header-right {
            text-align: right;
            font-size: 11px;
            color: #374151;
          }
          .logo {
            width: 90px;
            height: auto;
          }
          .logo-placeholder {
            width: 90px;
            height: 40px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          thead {
            display: table-header-group;
          }
          th,
          td {
            border: 1px solid #d1d5db;
            padding: 5px;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
          }
          th {
            background: #f3f4f6;
            font-weight: 600;
          }
          tr {
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        ${headerHtml}
        <table>
          <thead>
            <tr>${headCells}</tr>
          </thead>
          <tbody>
            ${bodyRows || `<tr><td colspan="${columns.length}">No rows found for selected filters.</td></tr>`}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

export const reportService = {
  async getInvoiceReport(query: { projectId?: string; from: string; to: string }) {
    const rows = await reportRepository.getInvoiceData(query);

    const groupedByProject = new Map<string, {
      projectId: string;
      projectName: string;
      totalSeconds: number;
      tasks: Map<string, { taskId: string; taskName: string; totalSeconds: number; entries: number }>;
    }>();

    for (const row of rows) {
      const project = relationOne(row.projects);
      const taskRel = relationOne(row.tasks);

      const projectId = row.project_id;
      const projectName = project?.name ?? 'Unknown Project';
      const taskId = row.task_id;
      const taskName = taskRel?.title ?? 'Unknown Task';
      const duration = row.total_duration_seconds ?? 0;

      if (!groupedByProject.has(projectId)) {
        groupedByProject.set(projectId, {
          projectId,
          projectName,
          totalSeconds: 0,
          tasks: new Map(),
        });
      }

      const projectBucket = groupedByProject.get(projectId)!;
      projectBucket.totalSeconds += duration;

      if (!projectBucket.tasks.has(taskId)) {
        projectBucket.tasks.set(taskId, {
          taskId,
          taskName,
          totalSeconds: 0,
          entries: 0,
        });
      }

      const taskBucket = projectBucket.tasks.get(taskId)!;
      taskBucket.totalSeconds += duration;
      taskBucket.entries += 1;
    }

    const totalSeconds = rows.reduce((sum, row) => sum + (row.total_duration_seconds ?? 0), 0);

    return {
      from: query.from,
      to: query.to,
      projects: Array.from(groupedByProject.values()).map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        totalSeconds: project.totalSeconds,
        totalHours: Number((project.totalSeconds / 3600).toFixed(2)),
        tasks: Array.from(project.tasks.values()).map((task) => ({
          ...task,
          totalHours: Number((task.totalSeconds / 3600).toFixed(2)),
        })),
      })),
      totalSeconds,
      totalHours: Number((totalSeconds / 3600).toFixed(2)),
    };
  },

  async getDailyActivityReport(query: { date?: string; projectId?: string; taskId?: string; userId?: string }) {
    const rows = await reportRepository.getDailyActivityData(query);

    return {
      generatedAt: new Date().toISOString(),
      filters: query,
      rows,
    };
  },

  async getDailyActivityPdfBuffer(query: {
    date?: string;
    projectId?: string;
    taskId?: string;
    userId?: string;
    showStart?: string | string[];
    showStop?: string | string[];
    showCarryForward?: string | string[];
    showCumulativeHours?: string | string[];
    showNote?: string | string[];
    showBlocker?: string | string[];
    showReassignment?: string | string[];
  }) {
    const report = await this.getDailyActivityReport(query);

    const showStart = parseBool(query.showStart, false);
    const showStop = parseBool(query.showStop, false);
    const showCarryForward = parseBool(query.showCarryForward, false);
    const showCumulativeHours = parseBool(query.showCumulativeHours, false);
    const showNote = parseBool(query.showNote, true);
    const showBlocker = parseBool(query.showBlocker, true);
    const showReassignment = parseBool(query.showReassignment, true);

    const submittedDate = new Date().toISOString().slice(0, 10);
    const logoPath = path.join(process.cwd(), '..', 'public', 'images', 'logo', 'logo-icon.png');
    const logoDataUrl = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
      : undefined;

    const columns: Array<{ key: string; label: string }> = [
      { key: 'workDate', label: 'Date' },
      { key: 'userName', label: 'User' },
      { key: 'projectName', label: 'Project' },
      { key: 'taskName', label: 'Task' },
      { key: 'status', label: 'Status' },
    ];

    if (showStart) columns.push({ key: 'startTime', label: 'Start' });
    if (showStop) columns.push({ key: 'stopTime', label: 'Stop' });

    columns.push({ key: 'duration', label: 'Duration' });

    if (showNote) columns.push({ key: 'workLogNote', label: 'Note' });
    if (showBlocker) columns.push({ key: 'blockerReason', label: 'Blocker' });
    if (showCarryForward) columns.push({ key: 'carryForward', label: 'Carry' });
    if (showCumulativeHours) columns.push({ key: 'cumulativeHours', label: 'Cumulative (h)' });
    if (showReassignment) columns.push({ key: 'reassignmentReason', label: 'Reassignment Reason' });

    const rows = report.rows.map((row) => ({
      workDate: row.workDate,
      userName: row.userName,
      projectName: row.projectName,
      taskName: row.taskName,
      status: row.status,
      startTime: formatTime(row.startTime),
      stopTime: formatTime(row.stopTime),
      duration: formatDuration(row.totalDurationSeconds),
      workLogNote: row.workLogNote || '-',
      blockerReason: row.blockerReason || '-',
      carryForward: row.carryForward ? 'Yes' : 'No',
      cumulativeHours: typeof row.cumulativeSeconds === 'number'
        ? (row.cumulativeSeconds / 3600).toFixed(2)
        : '-',
      reassignmentReason: row.reassignmentReason || '-',
    }));

    const html = buildDailyActivityPdfHtml({
      rows,
      columns,
      submittedDate,
      logoDataUrl,
    });

    let browser: Browser | undefined;
    try {
      const executablePath = resolveChromeExecutable();
      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' },
      });

      const buffer = Buffer.from(pdfBytes);

      if (!buffer || buffer.length < 100) {
        throw new Error(`PDF buffer is empty (size ${buffer?.length ?? 0})`);
      }

      return buffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[DailyActivityPDF] Failed to generate PDF:', message);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  },
};







