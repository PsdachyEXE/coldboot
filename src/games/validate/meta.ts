/** Registry text for `validate`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const VALIDATE_ID = 'validate';
export const VALIDATE_TITLE = 'Validation checks and boundary values';
export const VALIDATE_KK: KkId[] = ['U3O1-KK10', 'U4O1-KK05', 'U3O1-KK14', 'U4O1-KK06'];
export const VALIDATE_SUMMARY = 'Name the check that rejects an input, and choose boundary values';

export const VALIDATE_MAN = `validate drills the study design's three validation techniques: existence checking, type checking and range checking. Validation checks that data is reasonable and complete. It can't tell whether data is accurate: an age of 34 passes every check even if the person is really 43. Checking accuracy is verification.

Each field has a specification, such as "Age in years: required, integer, 16 to 120." Four test inputs follow. For each one, name the first check that rejects it, or type valid if none does. The checks always run in this order:
  existence (also called presence): has a value been entered in a required field, or is it empty? An optional field left blank is valid.
  type: is the data of the stated type, such as an integer, a floating point number or a real date?
  range: does the value fall within the stated range? For a string, this game's range check tests the number of characters.

After the four inputs, choose boundary test values for the same field: the lowest and highest valid values, and the nearest invalid values just outside the range. Values like these are relevant test data for a testing table.

Example: for "Age in years: required, integer, 16 to 120", the input "15" is an integer below 16, so type range. "sixteen" fails the type check, and a blank fails the existence check.

A round has 10 questions: two fields, each with four inputs and one boundary question. On a phone, tap existence, type, range or valid below the prompt.

Difficulty: --easy uses integers, floating point numbers and strings, normal adds dates, typed as day/month/year, and --hard has more dates and floating point numbers.

Usage: play validate [--easy|--hard]`;
