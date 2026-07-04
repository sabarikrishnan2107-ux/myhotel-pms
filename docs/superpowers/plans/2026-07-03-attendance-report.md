# Attendance Report HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task with reviews between tasks.

**Goal:** Create a self-contained, responsive HTML attendance report displaying employee logs grouped by branch with summary statistics and professional styling.

**Architecture:** Single self-contained HTML file with embedded CSS and dummy JSON data. No external dependencies. Responsive grid layout for summary cards, branch sections with detailed tables, and print-friendly styling.

**Tech Stack:** HTML5, inline CSS, embedded JSON data

## Global Constraints
- No external dependencies or CDNs
- Responsive: mobile (<768px), tablet (768-1023px), desktop (1024px+)
- Print-friendly styling
- Professional card-based design matching reference image
- Self-contained in single file

---

### Task 1: Create HTML Structure and Dummy Data

**Files:**
- Create: `attendance-report.html`

**Interfaces:**
- Produces: `attendanceReport` object with `metadata`, `summary`, and `branches` array; each branch contains `employees` array

- [ ] **Step 1: Create the HTML file with full structure**

Create `attendance-report.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Report</title>
    <style>
        /* Will be added in Task 2 */
    </style>
</head>
<body>
    <div id="app"></div>
    
    <script>
        const attendanceReport = {
            metadata: {
                title: "ATTENDANCE LOG REPORT",
                dateRange: "01 July 2026 - 31 July 2026",
                property: "HYDERS+PARK",
                generatedAt: new Date().toLocaleString()
            },
            summary: {
                totalEvents: 156,
                totalEmployees: 28,
                totalBranches: 3
            },
            branches: [
                {
                    name: "TANJORE",
                    department: "Housekeeping",
                    employeeCount: 12,
                    firstLogTime: "07:02:00",
                    lastLogTime: "18:45:00",
                    employees: [
                        { name: "PUNITHA K", id: "3041", firstLogin: "07:02:00", lastLogin: "18:30:00", eventCount: 5 },
                        { name: "SABARI SELVAN", id: "3029", firstLogin: "08:07:00", lastLogin: "17:45:00", eventCount: 4 },
                        { name: "SUKANYA SUKANYA", id: "3027", firstLogin: "08:25:00", lastLogin: "18:15:00", eventCount: 6 },
                        { name: "THAMIMUL ANSARI", id: "3001", firstLogin: "08:39:00", lastLogin: "18:00:00", eventCount: 5 },
                        { name: "KALAI ARASAN", id: "3034", firstLogin: "08:46:00", lastLogin: "17:30:00", eventCount: 4 },
                        { name: "ARI KUMARAN", id: "3021", firstLogin: "08:51:00", lastLogin: "18:20:00", eventCount: 5 },
                        { name: "Saleem Ahmed", id: "33100", firstLogin: "08:54:00", lastLogin: "17:45:00", eventCount: 4 },
                        { name: "MOHAN KUMAR", id: "3045", firstLogin: "07:15:00", lastLogin: "18:35:00", eventCount: 6 },
                        { name: "RAJA KRISHNAN", id: "3050", firstLogin: "08:10:00", lastLogin: "18:10:00", eventCount: 5 },
                        { name: "PRIYA SHARMA", id: "3061", firstLogin: "07:45:00", lastLogin: "18:45:00", eventCount: 7 },
                        { name: "ASHA PATEL", id: "3072", firstLogin: "08:20:00", lastLogin: "18:25:00", eventCount: 5 },
                        { name: "VIJAY NAIR", id: "3083", firstLogin: "08:55:00", lastLogin: "17:50:00", eventCount: 4 }
                    ]
                },
                {
                    name: "KODAI",
                    department: "Front Office",
                    employeeCount: 9,
                    firstLogTime: "07:30:00",
                    lastLogTime: "17:20:00",
                    employees: [
                        { name: "Udayan Sivasakthivel", id: "3200", firstLogin: "08:24:00", lastLogin: "17:15:00", eventCount: 4 },
                        { name: "Selva Kaviyan", id: "3025", firstLogin: "08:34:00", lastLogin: "17:45:00", eventCount: 5 },
                        { name: "RAMESH KUMAR", id: "3094", firstLogin: "07:30:00", lastLogin: "17:20:00", eventCount: 6 },
                        { name: "DEEPAK SINGH", id: "3105", firstLogin: "08:15:00", lastLogin: "17:30:00", eventCount: 5 },
                        { name: "ANJALI GUPTA", id: "3116", firstLogin: "08:45:00", lastLogin: "17:50:00", eventCount: 4 },
                        { name: "VIKRAM PATEL", id: "3127", firstLogin: "07:50:00", lastLogin: "17:35:00", eventCount: 5 },
                        { name: "NEHA VERMA", id: "3138", firstLogin: "08:30:00", lastLogin: "17:25:00", eventCount: 4 },
                        { name: "ARUN REDDY", id: "3149", firstLogin: "08:00:00", lastLogin: "17:40:00", eventCount: 5 },
                        { name: "POOJA MISHRA", id: "3150", firstLogin: "08:35:00", lastLogin: "17:55:00", eventCount: 6 }
                    ]
                },
                {
                    name: "MAIN BUILDING",
                    department: "Management",
                    employeeCount: 7,
                    firstLogTime: "08:00:00",
                    lastLogTime: "18:30:00",
                    employees: [
                        { name: "RAJESH KUMAR", id: "1001", firstLogin: "08:00:00", lastLogin: "18:30:00", eventCount: 8 },
                        { name: "KAVYA REDDY", id: "1012", firstLogin: "08:15:00", lastLogin: "18:20:00", eventCount: 7 },
                        { name: "SURESH NAIR", id: "1023", firstLogin: "08:10:00", lastLogin: "18:25:00", eventCount: 7 },
                        { name: "MEENA SHARMA", id: "1034", firstLogin: "08:30:00", lastLogin: "18:15:00", eventCount: 6 },
                        { name: "ARJUN SINGH", id: "1045", firstLogin: "08:05:00", lastLogin: "18:35:00", eventCount: 8 },
                        { name: "DIVYA PATEL", id: "1056", firstLogin: "08:20:00", lastLogin: "18:10:00", eventCount: 6 },
                        { name: "SANDEEP KUMAR", id: "1067", firstLogin: "08:25:00", lastLogin: "18:40:00", eventCount: 7 }
                    ]
                }
            ]
        };

        // Render function will be added in Task 3
    </script>
</body>
</html>
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la attendance-report.html` (or use File Explorer on Windows)
Expected: File exists with proper HTML structure and dummy data

- [ ] **Step 3: Commit**

```bash
git add attendance-report.html
git commit -m "feat: create attendance report HTML structure with dummy data"
```

---

### Task 2: Add Complete CSS Styling

**Files:**
- Modify: `attendance-report.html` (replace `/* Will be added in Task 2 */` comment in `<style>` tag)

**Interfaces:**
- Consumes: HTML structure from Task 1
- Produces: Fully styled page with responsive grid layout, card styling, table styles, and print styles

- [ ] **Step 1: Replace the CSS section**

Replace the CSS comment section with:

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-color: #f9fafb;
    color: #1f2937;
    line-height: 1.6;
    padding: 20px;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
}

/* Header */
header {
    background-color: white;
    padding: 30px;
    border-radius: 8px;
    margin-bottom: 30px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-title {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 10px;
    color: #000;
}

.header-meta {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 25px;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.header-meta span {
    display: flex;
    align-items: center;
    gap: 5px;
}

/* Summary Cards */
.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
}

.summary-card {
    background-color: white;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-left: 4px solid #3b82f6;
}

.summary-card.events {
    border-left-color: #10b981;
}

.summary-card.employees {
    border-left-color: #8b5cf6;
}

.summary-card.branches {
    border-left-color: #f59e0b;
}

.summary-label {
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    font-weight: 600;
}

.summary-value {
    font-size: 36px;
    font-weight: 700;
    color: #1f2937;
}

/* Branch Sections */
.branch-section {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 30px;
    overflow: hidden;
}

.branch-header {
    background-color: #f3f4f6;
    padding: 20px 25px;
    border-bottom: 1px solid #e5e7eb;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 20px;
}

.branch-title {
    font-size: 16px;
    font-weight: 700;
    color: #000;
}

.branch-meta {
    font-size: 13px;
    color: #6b7280;
}

.branch-meta-label {
    display: block;
    font-size: 11px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 3px;
    font-weight: 600;
}

/* Tables */
.employee-table {
    width: 100%;
    border-collapse: collapse;
}

.employee-table thead {
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
    border-bottom: 2px solid #e5e7eb;
}

.employee-table th {
    padding: 12px 15px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.employee-table td {
    padding: 12px 15px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 14px;
}

.employee-table tbody tr:hover {
    background-color: #f9fafb;
}

.employee-name {
    font-weight: 600;
    color: #1f2937;
}

.employee-id {
    color: #6b7280;
    font-size: 12px;
}

.time-badge {
    background-color: #e0f2fe;
    color: #0369a1;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    font-family: 'Courier New', monospace;
}

.event-count {
    background-color: #fef3c7;
    color: #92400e;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 13px;
    text-align: center;
    display: inline-block;
    min-width: 30px;
}

/* Footer */
footer {
    margin-top: 40px;
    padding: 20px;
    text-align: center;
    color: #9ca3af;
    font-size: 12px;
    border-top: 1px solid #e5e7eb;
}

/* Responsive Design */
@media (max-width: 1023px) {
    .branch-header {
        grid-template-columns: 1fr 1fr;
        gap: 15px;
    }
}

@media (max-width: 767px) {
    body {
        padding: 10px;
    }

    header {
        padding: 20px;
        margin-bottom: 20px;
    }

    .header-title {
        font-size: 20px;
    }

    .header-meta {
        flex-direction: column;
        gap: 8px;
    }

    .summary-grid {
        grid-template-columns: 1fr;
        gap: 15px;
        margin-bottom: 25px;
    }

    .summary-card {
        padding: 15px;
    }

    .summary-value {
        font-size: 28px;
    }

    .branch-header {
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .employee-table {
        font-size: 13px;
    }

    .employee-table th,
    .employee-table td {
        padding: 8px 10px;
    }

    .time-badge {
        font-size: 12px;
        padding: 3px 6px;
    }
}

/* Print Styles */
@media print {
    body {
        background-color: white;
        padding: 0;
    }

    .container {
        max-width: 100%;
    }

    header,
    .branch-section {
        box-shadow: none;
        border: 1px solid #e5e7eb;
        page-break-inside: avoid;
    }

    .branch-section {
        margin-bottom: 20px;
    }

    .employee-table tbody tr {
        page-break-inside: avoid;
    }

    footer {
        border-top: 1px solid #e5e7eb;
        margin-top: 20px;
        padding: 15px 0;
    }
}
```

- [ ] **Step 2: Verify the file has valid CSS**

Open `attendance-report.html` in a text editor and confirm the `<style>` section contains all the CSS code above.

- [ ] **Step 3: Commit**

```bash
git add attendance-report.html
git commit -m "feat: add complete CSS styling for attendance report"
```

---

### Task 3: Add Render Function and HTML Generation

**Files:**
- Modify: `attendance-report.html` (add render function in script section)

**Interfaces:**
- Consumes: `attendanceReport` object from Task 1, CSS styles from Task 2
- Produces: Dynamic HTML rendering of all sections, cards, and tables

- [ ] **Step 1: Add the render function**

Find the comment `// Render function will be added in Task 3` and replace it with:

```javascript
function renderReport() {
    const app = document.getElementById('app');
    const report = attendanceReport;

    // Header
    const header = document.createElement('header');
    header.innerHTML = `
        <div class="header-title">${report.metadata.title}</div>
        <div class="header-meta">
            <span><strong>${report.metadata.dateRange}</strong></span>
            <span>All Branches</span>
            <span>All Devices</span>
            <span>Generated ${report.metadata.generatedAt}</span>
            <span style="margin-left: auto; color: #8b5cf6;"><strong>${report.metadata.property}</strong></span>
        </div>
    `;
    app.appendChild(header);

    // Summary Cards
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'summary-grid';
    
    const cardsData = [
        { label: 'TOTAL EVENTS', value: report.summary.totalEvents, className: 'events' },
        { label: 'TOTAL EMPLOYEES', value: report.summary.totalEmployees, className: 'employees' },
        { label: 'TOTAL BRANCHES', value: report.summary.totalBranches, className: 'branches' }
    ];

    cardsData.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = `summary-card ${card.className}`;
        cardEl.innerHTML = `
            <div class="summary-label">${card.label}</div>
            <div class="summary-value">${card.value}</div>
        `;
        summaryContainer.appendChild(cardEl);
    });
    app.appendChild(summaryContainer);

    // Branch Sections
    report.branches.forEach(branch => {
        const branchSection = document.createElement('div');
        branchSection.className = 'branch-section';

        // Branch Header
        const branchHeader = document.createElement('div');
        branchHeader.className = 'branch-header';
        branchHeader.innerHTML = `
            <div>
                <div class="branch-title">${branch.name}</div>
                <div class="branch-meta">${branch.department}</div>
            </div>
            <div>
                <div class="branch-meta-label">EMPLOYEES</div>
                <div class="branch-meta">${branch.employeeCount}</div>
            </div>
            <div>
                <div class="branch-meta-label">FIRST LOG</div>
                <div class="branch-meta">${branch.firstLogTime}</div>
            </div>
            <div>
                <div class="branch-meta-label">LAST LOG</div>
                <div class="branch-meta">${branch.lastLogTime}</div>
            </div>
        `;
        branchSection.appendChild(branchHeader);

        // Employee Table
        const tableContainer = document.createElement('div');
        tableContainer.style.overflowX = 'auto';
        
        const table = document.createElement('table');
        table.className = 'employee-table';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>EMPLOYEE NAME</th>
                <th>ID</th>
                <th>FIRST LOGIN</th>
                <th>LAST LOGIN</th>
                <th>EVENTS</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        branch.employees.forEach(emp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><div class="employee-name">${emp.name}</div></td>
                <td><div class="employee-id">${emp.id}</div></td>
                <td><span class="time-badge">${emp.firstLogin}</span></td>
                <td><span class="time-badge">${emp.lastLogin}</span></td>
                <td><span class="event-count">${emp.eventCount}</span></td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        branchSection.appendChild(tableContainer);

        app.appendChild(branchSection);
    });

    // Footer
    const footer = document.createElement('footer');
    footer.innerHTML = `<p>${report.summary.totalEvents} total events · Generated ${report.metadata.generatedAt}</p>`;
    app.appendChild(footer);
}

// Call render function when DOM is ready
document.addEventListener('DOMContentLoaded', renderReport);
```

- [ ] **Step 2: Verify the function exists**

Open `attendance-report.html` and search for `function renderReport()`. Confirm it exists and is placed after the `attendanceReport` object definition.

- [ ] **Step 3: Commit**

```bash
git add attendance-report.html
git commit -m "feat: add render function to dynamically generate report HTML"
```

---

### Task 4: Test the Report in Browser and Verify Styling

**Files:**
- Test: `attendance-report.html` (visual verification)

**Interfaces:**
- Consumes: Complete `attendance-report.html` from Tasks 1-3
- Produces: Verified working report with correct layout and styling

- [ ] **Step 1: Open the file in a browser**

Open `attendance-report.html` in a web browser (double-click or drag to browser window).

Expected: 
- Page loads without errors
- Header displays with title, date range, property name
- Three summary cards appear at top showing 156 events, 28 employees, 3 branches
- All colors are visible (blue cards, proper typography)

- [ ] **Step 2: Verify desktop layout**

At full screen width (1024px+):
- Summary cards display in a 3-column grid
- Branch sections have 4-column headers (Branch name, Employee count, First log, Last log)
- All employee tables are fully visible without horizontal scroll
- Colors match design (blue badges, gray headers, white backgrounds)

Expected: All elements are properly aligned and visible

- [ ] **Step 3: Test responsive design on tablet (768px width)**

Resize browser to 768px width (or use DevTools responsive mode).

Expected:
- Summary cards stack to 2 columns
- Branch headers adapt to 2-column layout
- Tables remain readable with proper padding

- [ ] **Step 4: Test responsive design on mobile (375px width)**

Resize browser to 375px width (mobile size).

Expected:
- All elements stack in single column
- Summary cards are full width
- Tables are readable with reduced padding
- No horizontal scrolling of page

- [ ] **Step 5: Test print preview**

Press `Ctrl+P` (or `Cmd+P` on Mac) to open print preview.

Expected:
- No shadows or unnecessary styling appears
- Tables are complete without page breaks mid-row
- Footer shows at bottom
- All text is readable at print size

- [ ] **Step 6: Verify all branches display correctly**

Scroll through the page and verify:
- TANJORE branch shows 12 employees, first log 07:02:00, last log 18:45:00
- KODAI branch shows 9 employees, first log 07:30:00, last log 17:20:00
- MAIN BUILDING branch shows 7 employees, first log 08:00:00, last log 18:30:00
- All employee names, IDs, and times are visible in tables

Expected: All data displays correctly without errors

- [ ] **Step 7: Commit**

```bash
git add attendance-report.html
git commit -m "feat: complete and test attendance report HTML"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✓ Header with title and date range
- ✓ Summary statistics cards (total events, employees, branches)
- ✓ Branch-based organization with separate sections
- ✓ Employee attendance tables (name, ID, first login, last login, event count)
- ✓ Professional styling with card-based layout
- ✓ Color badges for time displays
- ✓ Responsive design for mobile/tablet/desktop
- ✓ Print-friendly styling
- ✓ Dummy data embedded
- ✓ Self-contained, no external dependencies

**Quality Checks:**
- ✓ All code is complete (no TBDs, TODOs, or placeholders)
- ✓ Exact file paths and commands provided
- ✓ CSS includes all responsive breakpoints
- ✓ JavaScript function renders complete DOM
- ✓ Dummy data is realistic and matches reference image scale
- ✓ Each task is independently testable
