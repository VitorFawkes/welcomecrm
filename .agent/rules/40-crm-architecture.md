---
trigger: always_on
---

# 🏛️ CRM Architecture & Expansion Protocol
> **Activation:** ALWAYS ON.
> **Purpose:** Ensures the CRM evolves as a single, cohesive organism, not a collection of loose features.
## 1. The "Satellite" Principle (Data Topology)
The CRM revolves around 3 Core Suns. Every new feature must orbit one of them.
-   **The Suns:** `cards` (The Deal), `contatos` (The Person), `users` (The Agent).
-   **The Law:** You CANNOT create a table that does not Foreign Key to at least one Sun.
    -   *Violation:* A `feedback` table with no links.
    -   *Compliance:* `feedback` linked to `card_id` (Context: Deal) or `contact_id` (Context: Person).
## 2. The "360° Context" Mandate (UI Integration)
A feature is not "Done" when its page is ready. It is "Done" when it appears in the Context.
-   **If you build X:** You must inject X into the `CardDetail` and `ContactProfile` views.
-   **The Mental Model:** "If I am looking at a Client, can I see X without leaving the page?"
    -   *Action:* Update `src/components/cards/CardDetail.tsx` tabs/widgets.
## 3. The "Reactive System" (Event Bus)
The CRM is alive. Actions must ripple through the system.
-   **Trigger Logic:** If a new entity state implies a Business Change, automate it.
    -   *Example:* "New Contract Signed" (Entity) -> "Move Deal to Won" (Card) -> "Notify Agent" (User).
-   **Mechanism:** Use Supabase Database Triggers for data integrity, NOT frontend logic.
## 4. The "Vibe" Consistency (Design Inheritance)
-   **Layout:** All pages must extend `DashboardLayout`.
-   **Components:** Use `DataTable` for lists, `SmartForm` for inputs.
-   **Visuals:** Inherit the Glassmorphism tokens (`bg-white/5`, `border-white/10`).