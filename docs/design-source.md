# Stitch design source

Project: **EduInsight AI Platform** (`4324137348933330533`). Existing screen HTML was inspected using the authenticated Stitch MCP download tool; screens were not regenerated or changed.

| Screen                         | Source screen ID                 | Implementation          |
| ------------------------------ | -------------------------------- | ----------------------- |
| Curriculum Overview            | 27b87a5538a6441090849efdaca93f15 | `/`                     |
| Topic Performance              | ae2a502c99cb4b958dd1f2ee5b99d814 | `/topic-analytics`      |
| Textbook Effectiveness         | 2ea8a2b86ca2468c92b3e6dc91ffaa6f | `/textbook-comparison`  |
| Curriculum Optimizer (compact) | fd1cbd59bdc944f3a3b1e0d3ee61d743 | `/curriculum-optimizer` |
| Data Sources                   | cdd433d24cd34b11abb41979ea6190fc | `/datasets`             |

Preserved: 240px district sidebar, 64px top bar, Geist headings/Inter body, pale `#f8f9ff` canvas, white 12px-radius panels, indigo `#4f46e5` controls, `#3525cd` primary, `#006e4c` mastery green, `#ba1a1a` deficit red, compact typography, heatmap, allocation matrix, comparison layout, and evidence panels.

Responsive extension: sidebar becomes an accessible mobile drawer; panels stack; wide tables scroll within panels; filters remain available. Recommendations and Settings extend the same design system because this project did not contain standalone source screens for them. Lucide icons replace Material Symbols; an icon mark and initials replace externally hosted logo/avatar assets. Metrics derive from records rather than copying inconsistent placeholder values. Unverified statistical, AI, security, and privacy claims from the mockups are replaced with accurate disclosures.
