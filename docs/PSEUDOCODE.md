# Pseudocode house style

Every pseudocode listing in COLDBOOT follows this style: content items, case study figures, and the `deskcheck` and `triage` generators with the interpreter they share (`src/games/deskcheck/interpreter.ts`). It was reconciled against the VCAA sources in October 2026 and replaces the reconstruction written while the sources were unavailable (DECISIONS D-001).

## There is no single standard

The study design's Terms entry for pseudocode says there is no standard, only common conventions, and VCAA's own documents don't agree with each other:

- The 2025 examination writes upper-case bold keywords (`BEGIN`, `IF ... THEN`, `ELSEIF`, `ELSE`, `ENDIF`, `DISPLAY`, `RETURN`, `AND`), the comparisons `<`, `<=` and `>`, and the Booleans `True` and `False` in regular weight.
- The 2025 sample questions write bold keywords with only the first letter capitalised: `Begin`, `For i From 0 To 2` ... `End For` (two words) and `Print`, and put two indexes in one pair of brackets (`numbers[1,2]`).
- VCAA's outcome-specific requirements (*Software tools and functions and outcome-specific requirements*, 2026) list the keywords a listing may use, with a choice for most constructs (next section).
- The Terms entry gives `START`/`BEGIN`, `FINISH`/`END`, `IF…ELSE`, `SELECT`, `REPEAT…UNTIL`, `WHILE…DO` and `FOR…NEXT` as examples.

Students should be able to read any of these forms. COLDBOOT picks one form for each construct, so every listing a student practises on looks the same. Each choice below says where it comes from:

- **Exam**: as printed in the 2025 examination.
- **OSR**: one of the forms the outcome-specific requirements allow.
- **House**: our choice, where the sources are silent or offer several forms.

## What the outcome-specific requirements allow

- Program block: `BEGIN` at the start, `END` at the end.
- Keywords: capitalised, in bold.
- Layout: indenting shows which statements sit inside which, including nested control structures.
- Assignment: `←` or `SET`.
- Input: `READ` or `INPUT`.
- Output: `PRINT`, `RETURN` or `OUTPUT`.
- Selection: `IF-THEN`, `IF-THEN-ELSE`, `IF-ELSEIF`, `CASE/SWITCH`.
- Repetition: `DO-WHILE`, `REPEAT-UNTIL`, `WHILE`, `FOR`.
- Joining conditions: `AND`, `OR`.
- Line numbers: optional.

They don't fix closing keywords (such as `ENDIF`), function headers, comments, array notation or symbols for the operators. The operators are named only in words: arithmetic (including integer division and modulus), logical (`AND`, `OR`, `NOT`) and comparison (equality, inequality, less than, less than or equal to, greater than, greater than or equal to).

## Layout

| Rule | Source |
|---|---|
| Keywords are upper case, and the renderer sets them in bold. | Exam, OSR |
| A program starts with `BEGIN` and ends with `END`. A listing of functions is one or more `FUNCTION ... ENDFUNCTION` blocks, with at most one `BEGIN ... END` block beside them. | Exam, OSR (`BEGIN`/`END`); House (`FUNCTION`; the exam's 7-line bonus fragment has neither `BEGIN` nor a function header) |
| Compound keywords are one word: `ELSEIF`, `ENDIF`, `ENDWHILE`, `ENDFOR`, `ENDFUNCTION`. | Exam (`ELSEIF`, `ENDIF`); House (the rest, to match) |
| Indent four spaces per level. `ELSEIF`, `ELSE` and `ENDIF` line up with their `IF`, and everything between `BEGIN` and `END` is one level in. | Exam (one level per nesting), OSR; House (four spaces) |
| The renderer numbers every line from 1, and questions refer to those numbers ("the value of `total` after line 6"). Don't leave blank lines. | Exam (numbered from 1); the OSR allows either |
| Names are camelCase or snake_case, used consistently within a listing, unless a question is about naming conventions. The generators use camelCase. | Exam (snake_case, such as `rental_price`); House |
| Comments start with `//`. | House (no source shows a comment) |

## Statements

| Construct | Form | Source |
|---|---|---|
| Assignment | `total ← 0` | OSR and the sample questions; the exam has no assignment. House: `←` rather than `SET`. |
| Output | `DISPLAY total` and `DISPLAY "Total: " + total` | Exam. House: `DISPLAY` rather than the OSR's `PRINT` or `OUTPUT`. |
| Input | `INPUT age` (never in a traced listing: the interpreter doesn't run it, so the question gives the input values instead) | OSR. House: `INPUT` rather than `READ`. |
| Return | `RETURN total`, `RETURN False` | Exam, OSR |
| Selection | `IF score >= 50 THEN` / `ELSEIF score >= 40 THEN` / `ELSE` / `ENDIF` | Exam |
| Multi-way selection | `CASE choice OF` / `1: DISPLAY "Add"` / `OTHERWISE: DISPLAY "Unknown"` / `ENDCASE`, each value one level in | OSR names `CASE/SWITCH`; House form. The interpreter doesn't run it. |
| Counted loop | `FOR i ← 0 TO 4` ... `ENDFOR` (both bounds inclusive; add `STEP -1` to count down) | OSR names `FOR`; House form (the sample questions write `For i From 0 To 2` ... `End For`) |
| Pre-test loop | `WHILE count < 5 DO` ... `ENDWHILE` | OSR names `WHILE`; `DO` as in the Terms entry; House (`ENDWHILE`) |
| Post-test loop | `REPEAT` ... `UNTIL count >= 5` | OSR (its sample uses it) |
| Function | `FUNCTION average(values, n)` ... `RETURN sum / n` ... `ENDFUNCTION` | House |
| Call | `result ← average(marks, 5)` | House |

COLDBOOT writes every post-test loop as `REPEAT ... UNTIL`. The OSR's `DO-WHILE` also tests after the body, but it repeats while its condition is true, where `UNTIL` stops once its condition is true.

## Expressions

- **Comparison: `=`, `<>`, `<`, `<=`, `>`, `>=`.** These are the exam's ASCII forms: the exam prints `<`, `<=` and `>`, its report writes `>=`, and `=` follows the same pattern. `<>` for not equal is a house choice, because the exam has no not-equal comparison. Don't write `≠`, `≤`, `≥`, `!=` or `==`.
- **Booleans: `True` and `False`**, with a capital first letter, in regular weight like any other value (the renderer doesn't highlight them as keywords). Exam. In prose, write "true" and "false" in lower case. Answers accept any case.
- **Logical: `AND`, `OR`, `NOT`**, in upper case like keywords. Exam (`AND`), OSR.
- **Arithmetic:** `+`, `-` and `*`, with brackets for grouping (Exam). `/` for division, which always gives a floating point result (House: the exam doesn't divide). `MOD` gives the remainder and `DIV` integer division rounded down (House; the OSR names modulus and integer division only in words).
- **Strings:** double quotes (Exam). `+` joins strings, and `LENGTH(name)` is the number of characters (House).
- **Numbers:** plain digits with no `$` and no thousands separator, such as `2000` (Exam).
- The exam also used a plain-English condition (checking that a value isn't blank). That's fine in a design question, but listings that are traced avoid it, because the interpreter can't run it.

The interpreter still reads `≠`, `≤` and `≥` (as `<>`, `<=` and `>=`) and `TRUE` and `FALSE` (as `True` and `False`), so a listing written in the older style keeps running while content is converted. It rejects `!=`, `==`, `<-`, `PRINT`, `OUTPUT` and `SET` with the house form to use instead.

## Arrays

- One-dimensional: `scores[i]`. Two-dimensional: `grid[row][col]`, row first (House). The sample questions write both indexes in one pair of brackets, `numbers[1,2]`, which means the same as `numbers[1][2]`.
- **Every question involving an array states its index base**, such as "Arrays are indexed from 0." Neither the exam nor the sample questions state a base in words, though the exam's array figures number the elements from 0. Generated questions vary the base between 0 and 1 (House).
- `LENGTH(scores)` is the number of elements. An array literal is written `[4, 8, 15]` (House).

## Testing tables

Laid out like the 2025 exam's testing table:

- Columns, in order: the test number (headed Test in the exam), one column for each input headed with that input's name (such as Age), Expected output, Actual output. The exam's output headings were longer (Expected output displayed, Actual output returned); either wording is fine. There is no description, purpose or pass/fail column.
- Inputs are bare values, with no `$`.
- Write each output in full, exactly as the program displays it, including any punctuation inside the quotes. The 2025 report gave no marks for shortened output.
- Each test uses a different combination of input values. The report gave no marks for repeating a test scenario.
- Test each boundary from both sides, such as 17 and 18 for "18 or over".
- When a question asks for expected output only, leave Actual output empty.

The `deskcheck` testing table uses this layout: Test, the input, Expected output, and Actual output left blank.

## Example

Arrays are indexed from 0.

```pseudo
BEGIN
    scores ← [72, 45, 90, 58]
    passCount ← 0
    allPassed ← True
    FOR i ← 0 TO 3
        IF scores[i] >= 50 THEN
            passCount ← passCount + 1
        ELSE
            allPassed ← False
        ENDIF
    ENDFOR
    IF passCount <> 0 THEN
        DISPLAY "Passed: " + passCount
    ENDIF
    DISPLAY allPassed
END
```

It displays `Passed: 3`, then `False`.
