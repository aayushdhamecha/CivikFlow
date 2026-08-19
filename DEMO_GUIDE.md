# CIVICFLOW Demo Guide

## Purpose and access model

CIVICFLOW retains the platform's OAuth identity flow for all real accounts and production data. For reviewers who need to explore the product immediately, `/demo-login` provides **public test credentials** for a separate in-browser simulation. The simulated workspace never calls protected production procedures, creates database records, uploads S3 evidence, or accesses real complaints. Seeded actors and reports are clearly labeled demo data and are never presented as citizen-generated records.

| Test workspace | Email | Password | What it demonstrates |
|---|---|---|---|
| Demo Citizen | `demo.citizen@civicflow.test` | `CivicDemo2026!` | A sample civic report, confirmed location, issue timeline, and citizen-visible workflow state. |
| Demo Administrator | `demo.admin@civicflow.test` | `CivicDemo2026!` | Sample operational review, AI-assistance context, assignment progression, and resolution actions. |

> **Important:** These values are intentionally public and are valid **only** for the isolated browser demo. They are not external accounts, cannot access OAuth sessions, and cannot access production data.

| Demo role | Secure setup | What the reviewer can demonstrate |
|---|---|---|
| Administrator | Sign in using the project owner account. The owner is promoted to `admin` by the server-side identity upsert. | Prepare demo data, maintain categories/departments, and promote team accounts. |
| Citizen | Sign in with a separate real OAuth account. New accounts default to `citizen`. | Submit a report with a location and evidence; track updates; provide feedback after resolution. |
| Authority | Sign in with a separate real OAuth account, then use the Administrator workspace to set its role to `authority` and assign a department. | Review the queue, inspect AI recommendations, assign work, and move a report through the validated lifecycle. |

> **Important:** Use at least two real signed-in identities for an end-to-end citizen/authority demo. This preserves the actual server-side authorization model rather than relying on a cosmetic role switcher.

## Fast reviewer walkthrough using test credentials

1. Open `/demo-login` from the **Try demo** action on the CIVICFLOW landing page.
2. Enter the **Demo Citizen** credentials and create or review the isolated sample report. The report receives a `CF-DEMO-…` identifier and starts as `Submitted`.
3. Sign out from the demo header, return to `/demo-login`, and enter the **Demo Administrator** credentials.
4. Advance the same sample report through `Under review`, `Verified`, `Assigned`, `In progress`, and `Resolved`. The visible AI cards are explicitly labeled as sample, non-binding recommendations.
5. Select **Reset sample** to start the browser-only walkthrough again. Closing the session or resetting the sample removes the demo state.

## Preview and publish

Use the project preview to explore the public landing page and test-demo entry. The following routes are available from the preview root:

| Route | Purpose |
|---|---|
| `/` | CIVICFLOW landing page with **Try demo** and **Use test demo** actions. |
| `/demo-login` | Interactive isolated test-login screen. Use `demo.citizen@civicflow.test` or `demo.admin@civicflow.test` with password `CivicDemo2026!`. |
| `/demo-preview/citizen` | Read-only visual preview of the Demo Citizen reporting workspace. |
| `/demo-preview/admin` | Read-only visual preview of the Demo Administrator operations workspace. |

> The test credentials are deliberately public for the browser-only sample workspace. They do not authenticate to the production OAuth flow and cannot access real civic records, files, or administrative procedures.

To publish the validated project, open the current project checkpoint in the management panel and select **Publish**. Publishing must be initiated by the project owner through that button; no additional deployment command is required.

## Prepare the demo catalog and sample reports

1. Sign in as the project owner and open `/admin`.
2. Select **Prepare demo data**. The idempotent operation creates clearly labeled demo reports and activates the relevant departments and categories.
3. If a second account will act as the authority, open **User access**, choose **Authority**, select an active department, and save.
4. The authority account can now open `/authority`, where its queue and analytics are scoped server-side. Administrators may inspect the full cross-department view.

## Verified end-to-end walkthrough

1. **Citizen:** Sign in and select **Report a Problem**. Choose an active category, enter a factual description, upload an allowed evidence image, and pin/confirm the exact map location.
2. **Citizen:** Submit the report. CIVICFLOW creates a unique `CF-…` complaint ID, stores the evidence reference securely, records a real `SUBMITTED` status-history entry, and queues non-binding AI recommendations.
3. **Authority:** Sign in with the authority account and open **Reports**. Find the new report by its complaint ID, view its submitted location and protected evidence, then review the classification, priority, and possible-duplicate recommendations as assistance—not verified fact.
4. **Authority:** Move the report through the server-enforced lifecycle: `SUBMITTED` → `UNDER_REVIEW` → `VERIFIED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED`. Assign the responsible department/officer before or during the assignment step and add notes/resolution detail where prompted.
5. **Citizen:** Open **My Complaints** and select the report. The status timeline and notifications are read from backend status-history/notification records, so they only show actual actions completed through the workflow.
6. **Citizen:** After the authority resolves the issue, submit feedback from the complaint detail page. Feedback remains associated with that report for authority review.

## Demo verification checks

- A citizen cannot open another citizen's complaint or protected evidence.
- An authority member cannot act on a report outside their assigned department; an administrator can oversee all departments.
- Invalid workflow jumps are rejected by the server even if a browser request is altered.
- The dashboard KPI values and map markers originate from stored complaint data, not hardcoded figures.
- If AI is unavailable, CIVICFLOW persists an explicit manual-review fallback rather than fabricating analysis.
