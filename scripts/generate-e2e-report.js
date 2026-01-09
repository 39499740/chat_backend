#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const coveragePath = args[0] || 'coverage/e2e/coverage-final.json';
const outputPath = args[1] || 'test-results/e2e-report.html';

if (!fs.existsSync(coveragePath)) {
  console.error('Coverage file not found:', coveragePath);
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const totalCoverage = coverage.total;

function generatePercentage(value) {
  return value ? (value * 100).toFixed(2) + '%' : 'N/A';
}

function getColorClass(percentage) {
  if (percentage >= 80) return 'success';
  if (percentage >= 60) return 'warning';
  return 'danger';
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E2E 测试覆盖率报告</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }

    .header h1 {
      color: #2c3e50;
      font-size: 32px;
      margin-bottom: 10px;
    }

    .header p {
      color: #7f8c8d;
      font-size: 16px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .summary-card {
      padding: 20px;
      border-radius: 6px;
      text-align: center;
    }

    .summary-card h3 {
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .summary-card .value {
      font-size: 36px;
      font-weight: bold;
      color: #2c3e50;
    }

    .success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
    }

    .success .value {
      color: #155724;
    }

    .warning {
      background: #fff3cd;
      border: 1px solid #ffeeba;
    }

    .warning .value {
      color: #856404;
    }

    .danger {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
    }

    .danger .value {
      color: #721c24;
    }

    .section {
      margin-bottom: 40px;
    }

    .section h2 {
      color: #2c3e50;
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e9ecef;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }

    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e9ecef;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .success .progress-fill {
      background: #28a745;
    }

    .warning .progress-fill {
      background: #ffc107;
    }

    .danger .progress-fill {
      background: #dc3545;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
      color: #7f8c8d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 E2E 测试覆盖率报告</h1>
      <p>Chat Backend 端到端测试报告</p>
    </div>

    <div class="summary">
      <div class="summary-card ${getColorClass((totalCoverage.lines.pct || 0) / 100)}">
        <h3>语句覆盖率</h3>
        <div class="value">${generatePercentage(totalCoverage.lines.pct)}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${totalCoverage.lines.pct || 0}%"></div>
        </div>
      </div>

      <div class="summary-card ${getColorClass((totalCoverage.branches.pct || 0) / 100)}">
        <h3>分支覆盖率</h3>
        <div class="value">${generatePercentage(totalCoverage.branches.pct)}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${totalCoverage.branches.pct || 0}%"></div>
        </div>
      </div>

      <div class="summary-card ${getColorClass((totalCoverage.functions.pct || 0) / 100)}">
        <h3>函数覆盖率</h3>
        <div class="value">${generatePercentage(totalCoverage.functions.pct)}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${totalCoverage.functions.pct || 0}%"></div>
        </div>
      </div>

      <div class="summary-card ${getColorClass((totalCoverage.statements.pct || 0) / 100)}">
        <h3>行覆盖率</h3>
        <div class="value">${generatePercentage(totalCoverage.statements.pct)}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${totalCoverage.statements.pct || 0}%"></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>📊 详细指标</h2>
      <table>
        <thead>
          <tr>
            <th>指标</th>
            <th>覆盖率</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>语句覆盖</td>
            <td>${generatePercentage(totalCoverage.lines.pct)}</td>
            <td><span class="badge ${getColorClass((totalCoverage.lines.pct || 0) / 100)}">${(totalCoverage.lines.pct || 0) >= 80 ? '优秀' : (totalCoverage.lines.pct || 0) >= 60 ? '良好' : '需改进'}</span></td>
          </tr>
          <tr>
            <td>分支覆盖</td>
            <td>${generatePercentage(totalCoverage.branches.pct)}</td>
            <td><span class="badge ${getColorClass((totalCoverage.branches.pct || 0) / 100)}">${(totalCoverage.branches.pct || 0) >= 80 ? '优秀' : (totalCoverage.branches.pct || 0) >= 60 ? '良好' : '需改进'}</span></td>
          </tr>
          <tr>
            <td>函数覆盖</td>
            <td>${generatePercentage(totalCoverage.functions.pct)}</td>
            <td><span class="badge ${getColorClass((totalCoverage.functions.pct || 0) / 100)}">${(totalCoverage.functions.pct || 0) >= 80 ? '优秀' : (totalCoverage.functions.pct || 0) >= 60 ? '良好' : '需改进'}</span></td>
          </tr>
          <tr>
            <td>行覆盖</td>
            <td>${generatePercentage(totalCoverage.statements.pct)}</td>
            <td><span class="badge ${getColorClass((totalCoverage.statements.pct || 0) / 100)}">${(totalCoverage.statements.pct || 0) >= 80 ? '优秀' : (totalCoverage.statements.pct || 0) >= 60 ? '良好' : '需改进'}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>📝 建议</h2>
      <table>
        <tbody>
          ${(totalCoverage.lines.pct || 0) < 60 ? '<tr><td><span class="badge danger">低覆盖率</span></td><td>当前覆盖率低于 60%，建议增加更多测试用例</td></tr>' : ''}
          ${(totalCoverage.lines.pct || 0) < 80 ? '<tr><td><span class="badge warning">中覆盖率</span></td><td>当前覆盖率在 60-80% 之间，建议补充边界情况测试</td></tr>' : ''}
          ${(totalCoverage.lines.pct || 0) >= 80 ? '<tr><td><span class="badge success">高覆盖率</span></td><td>当前覆盖率超过 80%，表现良好！</td></tr>' : ''}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p>Chat Backend E2E Test Coverage Report</p>
    </div>
  </div>
</body>
</html>`;

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, html, 'utf8');
console.log('✅ E2E 测试覆盖率报告已生成:', outputPath);
console.log('📊 总体覆盖率: ' + generatePercentage(totalCoverage.lines.pct));
