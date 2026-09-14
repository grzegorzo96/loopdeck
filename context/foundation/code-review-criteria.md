# Kryteria code review — Loopdeck (CI/CD agent)

> Pięć twardych kryteriów akceptacji PR-ów w tym repozytorium. Agent CI ocenia **wyłącznie diff** — bez dostępu do narzędzi ani pełnego kontekstu planu. Źródła: `AGENTS.md`, `CLAUDE.md`, `context/foundation/prd.md`.

## 1. Invariants produktu (focus limit)

**Pytanie:** Czy diff nie osłabia lub omija reguły produktu „max 3 zadania na dziś”?

- Limit **3 slotów focus** musi być egzekwowany **po stronie serwera** (service layer / DB constraint), nie tylko w UI.
- Przy `currentCount === 3` dodanie czwartego musi być **odmówione** (`>= FOCUS_LIMIT`, nie `>`).
- **Ukończone zadanie nadal zajmuje slot** na dany dzień (FR-004a) — liczenie slotów nie może wykluczać `is_completed = true`, chyba że diff jednoznacznie wprowadza nową, udokumentowaną regułę produktu.
- Odmowa limitu musi prowadzić do swapu lub anulowania — brak „cichego” dodania czwartego zadania.

**FAIL gdy:** diff zmienia warunek limitu, filtruje ukończone z focus count bez uzasadnienia produktowego, lub omija `checkFocusLimit` / constraint DB.

## 2. Bezpieczeństwo i granice auth

**Pytanie:** Czy diff nie wprowadza wycieku danych, braku auth albo secrets w kodzie?

- Trasy API w `src/pages/api/` wymagają auth tam, gdzie dotyczą danych użytkownika (`requireAuth`, middleware).
- **RLS włączone** na nowych tabelach Supabase; migracje w `supabase/migrations/` z granular policies per operacja.
- Brak hardcoded secrets; env przez `astro:env/server` lub zmienne CI.
- Dane jednego konta **nigdy** nie są widoczne dla innego (zapytania scoped do `auth.uid()` / RLS).

**FAIL gdy:** nowa tabela/migracja bez RLS, endpoint bez auth na danych użytkownika, secret w diffie, zapytanie omijające izolację tenantów.

## 3. Konwencje stacku

**Pytanie:** Czy diff trzyma się konwencji Astro 7 SSR + React islands + Tailwind 4?

- Strony/API SSR: `export const prerender = false` na dynamicznych trasach.
- React: **bez** dyrektyw Next.js (`"use client"` itd.); hooki w `src/components/hooks/`.
- Tailwind: łączenie klas przez `cn()` z `@/lib/utils`, nie konkatenacja stringów.
- Importy: alias `@/*` → `./src/*`.

**FAIL gdy:** diff łamie którąkolwiek z powyższych reguł w nowym lub zmienionym kodzie.

## 4. Warstwa API i danych

**Pytanie:** Czy diff poprawnie implementuje granice API i warstwę danych?

- Handlery API: eksporty **`GET` / `POST`** (uppercase), walidacja wejścia **zod** przed logiką biznesową.
- Supabase: obsługa błędów zapytań (nie ignorować `error` z klienta).
- Logika biznesowa w `src/lib/services/`, nie rozproszona po komponentach Astro/React bez powodu.
- Nowe migracje: nazwa `YYYYMMDDHHmmss_opis.sql`, RLS + policies.

**FAIL gdy:** nowy endpoint bez zod, ignorowany błąd Supabase w ścieżce mutacji, logika limitu/focus poza service layer bez uzasadnienia.

## 5. Zakres zmiany i ryzyko regresji

**Pytanie:** Czy diff jest spójny, minimalny i czy widać w nim obsługę oczywistych edge case’ów?

- Zmiana powinna dotyczyć deklarowanego problemu — brak niepowiązanych refaktorów w tym samym diffie.
- Przy zmianie reguł biznesowych (limit, reset dnia, swap) diff powinien uwzględniać powiązane ścieżki albo ryzyko regresji musi być **jawnie** opisane w findings.
- Usuwanie testów lub guardów bez zamiennika → podwyższone ryzyko.

**FAIL gdy:** diff miesza niepowiązane zmiany o wysokim ryzyku, usuwa zabezpieczenie bez alternatywy, lub wprowadza oczywistą regresję logiczną widoczną w samym patchu.

---

## Werdykt ogólny (bramka CI)

| Warunek | `overall_verdict` |
|--------|-------------------|
| Wszystkie kryteria `PASS` | `APPROVE` |
| Co najmniej jedno `FAIL`, ale bez krytycznego naruszenia bezpieczeństwa/produktu | `REQUEST_CHANGES` |
| `FAIL` na **Invariants produktu** lub **Bezpieczeństwo i auth** | `REJECT` |

Pipeline **przepuszcza** merge tylko przy `overall_verdict === "APPROVE"`.

## Powiązane artefakty

- JSON Schema odpowiedzi: `scripts/code-review/schema.json`
- Prompt systemowy: `scripts/code-review/build-prompt.mjs`
- Agent CI: `scripts/code-review-agent.mjs`
- Eval regresji promptu: `promptfoo/promptfoo.yaml` (`npm run eval:code-review`)
