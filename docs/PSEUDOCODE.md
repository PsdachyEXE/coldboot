# Pseudocode house style

Every pseudocode listing in COLDBOOT follows this style: content items, case study figures, and the `deskcheck` generator and its interpreter. It follows the conventions the build brief (Section 5) says the 2025 exam uses. The exam paper itself couldn't be checked when this was written (DECISIONS D-001), so the symbols below are the house choice until then. When the source is available, reconcile this file first, then the generator, then the content.

## Layout

- Keywords are uppercase. Identifiers are camelCase unless a question is about naming conventions.
- A listing starts with `BEGIN` and ends with `END`, or is a single `FUNCTION ... ENDFUNCTION`.
- Indent four spaces per level. Don't leave blank lines: the renderer numbers every line from 1, and questions refer to those numbers ("the value of `total` after line 6").
- Comments start with `//`.

## Statements

| Construct | Form |
|---|---|
| Assignment | `total ← 0` |
| Output | `DISPLAY total` and `DISPLAY "Total: " + total` |
| Input | `INPUT age` (rare in deskcheck questions: give the inputs in the question instead) |
| Selection | `IF score ≥ 50 THEN` / `ELSEIF score ≥ 40 THEN` / `ELSE` / `ENDIF` |
| Counted loop | `FOR i ← 0 TO 4` ... `ENDFOR` (both bounds inclusive; add `STEP -1` to count down) |
| Pre-test loop | `WHILE count < 5 DO` ... `ENDWHILE` |
| Post-test loop | `REPEAT` ... `UNTIL count ≥ 5` |
| Function | `FUNCTION average(values, n)` ... `RETURN sum / n` ... `ENDFUNCTION` |
| Call | `result ← average(marks, 5)` |

## Expressions

- Arithmetic: `+ - * /`, with `MOD` for the remainder and `DIV` for integer division rounded down. `/` gives a floating point result.
- Comparison: `= ≠ < ≤ > ≥`. Plain-text answers may use `<>`, `<=` and `>=`.
- Logical: `AND`, `OR`, `NOT`.
- Strings: double quotes. `+` joins strings. `LENGTH(name)` is the number of characters.
- Booleans: `TRUE` and `FALSE`.

## Arrays

- One-dimensional: `scores[i]`. Two-dimensional: `grid[row][col]` (row first).
- **Every question involving an array states its index base**, e.g. "Arrays are indexed from 0." Generated questions vary the base between 0 and 1.
- `LENGTH(scores)` is the number of elements.
- An array literal is written `[4, 8, 15]`.

## Test tables

Columns, in order: Test number, Input(s), Expected output, Actual output. When a question asks for expected output only, leave Actual output empty.
