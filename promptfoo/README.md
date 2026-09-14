# Code review evals (promptfoo)

Porównuje **2–3 modele** na **tych samych diffach** z twardymi asercjami pass/fail per kryterium.

## Wymagania

- `CURSOR_API_KEY` w środowisku (lub `.env`)
- `npm install` (zależność `promptfoo` w devDependencies)

## Uruchomienie

```bash
export CURSOR_API_KEY="cursor_..."
npm run eval:code-review
```

Wynik: macierz model × test z pass rate, kosztem (jeśli provider zwraca tokenUsage) i czasem (`latencyMs` w providerze).

## Regresja promptu

Po każdej zmianie w:

- `scripts/code-review/build-prompt.mjs`
- `scripts/code-review/schema.json`
- `context/foundation/code-review-criteria.md`

…uruchom eval ponownie. Spadek pass rate na znanych diffach = regresja przed wdrożeniem do CI.

## Fixture diffy

| Plik | Oczekiwane zachowanie |
|------|------------------------|
| `code-review-diff.patch` | FAIL `product_invariants` (>= → >, filtr completed) |
| `code-review-diff-good.patch` | APPROVE (tylko komentarz) |
| `code-review-diff-api-no-zod.patch` | FAIL security/auth lub api layer |
