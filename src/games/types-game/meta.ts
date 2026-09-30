/** Registry text for `types`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const TYPES_ID = 'types';
export const TYPES_TITLE = 'Data types, structures and sources';
export const TYPES_GAME_KK: KkId[] = ['U3O1-KK04', 'U3O1-KK05', 'U3O1-KK06', 'U4O1-KK02'];
export const TYPES_SUMMARY = 'Choose a data type, data structure and data source for a scenario';

export const TYPES_MAN = `types drills the choices a design makes for its data: a data type, a data structure and a data source. Each scenario has one best answer, and the feedback gives the one-line justification an exam answer needs.

Data types. Name the type in full, as the exam expects: Integer, Floating point, String, Character or Boolean. Short forms such as int or float ask you to try again.
  Digits that are never used in arithmetic, or that need a leading zero or spaces, are a String (a phone number such as 0412 345 678).
  Currency is Floating point, shown to two decimal places.
  Data that is always exactly one character, such as a grade from A to E, is a Character.
  Anything with only two states, such as whether a fee is paid, is a Boolean.

Data structures. Type one-dimensional array, two-dimensional array or record (1D and 2D work too).
  A one-dimensional array holds many values of one type, each reached by one index.
  A two-dimensional array holds values of one type in rows and columns, such as a seating plan.
  A record groups the fields of one item, which can have different types, each reached by its name.

Data sources. Type plain text, CSV or XML.
  Plain text is lines of text with no fields, such as a log of messages.
  A CSV file holds uniform records, one per line, with each field found by its position. It is compact and opens in a spreadsheet.
  XML names every value with a tag, so the file describes itself, can nest, and can gain new tags without breaking the programs that read it.

Example: "A mobile phone number, such as 0412 345 678. Which data type suits this data best?" Type String: it starts with 0, which an Integer would drop, it contains spaces, and it is never used in arithmetic.

A round has 10 questions in the order a design is built: a data type, then a data structure, then a data source, and again. On a phone, tap an answer below the prompt.

Difficulty: --easy uses the plainest scenarios, normal adds cases that need a distinction, and --hard leaves out the plainest and adds traps such as a postcode with a leading zero.

Usage: play types [--easy|--hard]`;
