/** Registry text for `validate`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const VALIDATE_ID = 'validate';
export const VALIDATE_TITLE = 'Validation checks and boundary values';
export const VALIDATE_KK: KkId[] = ['U3O1-KK10', 'U4O1-KK05', 'U3O1-KK14'];
export const VALIDATE_SUMMARY = 'Name the existence, type or range check that rejects an input, and pick boundary values';

export const VALIDATE_MAN = `validate drills the three validation checks: existence, type and range.

Each field has a specification, such as "Age in years: required, whole number, 16 to 120." Four test inputs follow. For each one, name the first check that rejects it, or type valid if none does. The checks always run in this order:
  existence: was anything entered? An optional field left blank is valid.
  type: is it the right kind of data, such as a whole number or a real date?
  range: is it between the limits? For text, the range check tests the number of characters.

After the four inputs, choose boundary test values for the same field: the lowest and highest valid values, and the nearest invalid values just outside the range.

Example: for "Age in years: required, whole number, 16 to 120", the input "15" is a whole number below 16, so type range. "sixteen" fails the type check, and a blank fails the existence check.

A round has 10 questions: two fields, each with four inputs and one boundary question. On a phone, tap existence, type, range or valid below the prompt.

Difficulty: --easy uses whole numbers, decimals and text, normal adds dates written as text, and --hard has more dates and decimals.

Usage: play validate [--easy|--hard]`;
