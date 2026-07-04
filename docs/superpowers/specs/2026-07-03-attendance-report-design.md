# Attendance Report HTML Design
**Date:** 2026-07-03

## Overview
Create a professional, responsive HTML report displaying employee attendance data organized by branch. The report mimics the Access Control Log Report style with summary statistics, branch-level grouping, and detailed employee attendance tables.

## Architecture

### Page Structure
1. **Header** — Title, date range, and summary statistic cards (total events, total employees, total branches)
2. **Branch Sections** — Repeating sections, one per branch:
   - Branch summary card (branch name, employee count, first/last log times for branch)
   - Detailed employee table (name, ID, first login, last login, event count)
3. **Footer** — Report generation timestamp

### Data Model
```
Attendance Report
├── metadata
│   ├── title: string
│   ├── dateRange: { start: string, end: string }
│   └── generatedAt: string
├── summary
│   ├── totalEvents: number
│   ├── totalEmployees: number
│   └── totalBranches: number
└── branches: Array<Branch>
    └── Branch
        ├── name: string
        ├── employeeCount: number
        ├── firstLogTime: string
        ├── lastLogTime: string
        └── employees: Array<Employee>
            └── Employee
                ├── name: string
                ├── id: string
                ├── firstLogin: string
                ├── lastLogin: string
                └── eventCount: number
```

## Visual Design

### Color System
- **IN badge**: Green (#10b981)
- **OUT badge**: Blue (#3b82f6)
- **Text**: Dark gray (#1f2937)
- **Borders**: Light gray (#e5e7eb)
- **Background**: White with light gray sections (#f9fafb)

### Layout
- **Summary cards** at top in a 3-column grid (responsive, stacks on mobile)
- **Branch sections** in card containers with light background
- **Tables** with alternating row colors for readability
- **Typography**: Clean, professional sans-serif (system fonts)

### Responsive Design
- Desktop (1024px+): Full 3-column summary grid, full-width tables
- Tablet (768px-1023px): 2-column summary grid, tables with horizontal scroll if needed
- Mobile (<768px): 1-column layout, stacked tables

## Implementation Details

### HTML Elements
- Semantic HTML5: `<header>`, `<main>`, `<section>`, `<table>`
- Inline CSS for self-contained file
- No external dependencies
- Dummy data embedded in JSON structure

### Functionality
- Static HTML with embedded data (no JavaScript required)
- Print-friendly styling (hides non-essential UI)
- Tables are fully responsive with horizontal scrolling on mobile

## Success Criteria
1. ✓ Displays summary statistics at top
2. ✓ Groups attendance data by branch
3. ✓ Shows first/last login times per employee
4. ✓ Matches professional styling of reference image
5. ✓ Responsive on mobile, tablet, desktop
6. ✓ Print-friendly output
7. ✓ Uses dummy data (no backend required)

## Files to Create
- `attendance-report.html` — Standalone self-contained report file
