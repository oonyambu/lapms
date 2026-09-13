# LAPMS — Learner Attendance & Parent Monitoring System

A multi-page site and working front-end prototype built from
`Learner_Attendance_Parent_Monitoring_System_Requirements.docx`.

```bash
python -m http.server 8123
```

Open <http://localhost:8123>. No build step, no dependencies.

> Opening `index.html` from disk works, but some browsers disable `localStorage` on
> `file://`, so changes won't persist. Serving over HTTP avoids that.

---

## Pages

**Public** — `index.html` (overview), `blueprint.html` (roles, workflow, 13 tables, security),
`privacy.html` (template notice, Data Protection Act 2019), `login.html`.

**Application** — `app/`, 18 pages: 6 administrator, 4 teacher, 4 guardian, plus shared
learner profile, messages, notifications and reports.

---

## Demo accounts

Mwangaza Primary School, Term 3 2026 — 4 classes, 44 learners, 39 guardians, ~1,100
attendance records over 25 school days. All fictional.

| Account | Role | Worth trying because |
|---|---|---|
| Josephine Mwende | Administrator | Whole school, reports, audit log |
| Margaret Achieng | Class teacher | Today's register is still outstanding |
| **Alice Njeri** | **Subject teacher** | Two classes, and **no authority to take a register** |
| **Mary Wekesa** | **Guardian** | Two children, different classes |
| Joseph Kiptoo | Guardian | One child |

Sign in as Alice Njeri, then as Mary Wekesa. Same data; different reach.

---

## Where access control lives

Section 16 of the requirements is the load-bearing one:

> every user sees only the information necessary for their role … enforced technically at the
> database and application levels, not merely through the user interface.

So the rule is **not** in the pages. Every read and write goes through
[`assets/js/store.js`](assets/js/store.js), scoped by session:

- `Store.scope(session)` resolves reach — teachers from `teacherAssignments`, guardians from
  authorised `parentLinks`.
- Every query filters on that scope; unscoped queries return only in-scope rows.
- Writes throw `ACCESS_DENIED` and append to the audit log.
- **Least privilege within a role:** only a class teacher may take a register. A subject
  teacher on the same class is refused.

Verifiable, not asserted — as a guardian, change the learner id in
`app/learner.html?id=…` to another family's child. `Store.learner()` returns `null`
whatever the screen does.

In production the same scoping belongs in the API and database (row-level security plus
server-side authorisation). The browser store stands in for that layer.

---

## Structure

```
index.html  blueprint.html  privacy.html  login.html
app/        18 pages, each self-contained (markup + its own page script)
assets/css  base.css (tokens, components) · site.css (public) · app.css (shell, charts)
assets/js   util · seed · store (ACCESS CONTROL) · auth · shell · charts
assets/img  Creative Commons photographs — see CREDITS.md
```

Data is generated from a seeded PRNG, so every reviewer sees the same school. Stored in
`localStorage`; **School settings → Reset demonstration data** rebuilds it.

---

## Charts

Statuses use a fixed palette — Present `#0ca30c`, Late `#fab219`, Absent `#d03b3b`,
Excused `#ec835a` — in that stacking order, which is the order validated for colour-vision
separation. Don't reorder it: Late beside Excused falls below the legibility floor.

Two fills are under 3:1 on the light surface, so colour never carries meaning alone — every
legend and tooltip pairs swatch with icon and label, segments are labelled, and every chart
has a **Table view**.

---

## Real vs. not

**Real:** access rules and enforcement, taking and submitting a register, guardian
confirmations, behaviour recording and sharing, comment threads, notification routing,
report aggregation and CSV export, the audit trail, and learner/class/link management.

**Not real:** authentication (accounts are picked from a list), the server, the database,
and push/SMS/email delivery.

**Next:** a PostgreSQL schema with row-level security from the 13 tables; a REST or GraphQL
API enforcing the same scope server-side; real authentication with optional 2FA; an SMS/push
gateway; an Android build.

---

Demonstration records are fictional. Photograph credits in [CREDITS.md](CREDITS.md).
