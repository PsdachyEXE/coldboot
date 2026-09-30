/**
 * The `types` scenario bank, written by hand. Each scenario has one clearly best answer and the
 * one-line justification the exam expects. The rules the scenarios rest on (study design examples
 * and mainstream textbook meaning):
 *
 * - Data types are named in full: Integer, Floating point, String, Character, Boolean. Digits that
 *   are never used in arithmetic, or that need leading zeros or spaces, are a String; currency is
 *   Floating point shown to two decimal places; data that is always exactly one character is a
 *   Character; anything with exactly two states ("whether ...") is a Boolean.
 * - Data structures: a one-dimensional array holds many values of one type reached by one index; a
 *   two-dimensional array holds values of one type reached by a row and a column; a record groups
 *   one item's fields of different types, reached by name. No scenario needs an array of records,
 *   because that isn't one of the three answers.
 * - Data sources: plain text has lines of text with no fields; a CSV file holds uniform records,
 *   one per line, with fields found by position (compact, opens in a spreadsheet); XML labels every
 *   value with a tag that names it, so it is self-describing, extensible and can nest.
 *
 * `level` sets which difficulties use a scenario: 1 is plain, 2 needs a distinction, 3 is a trap.
 */

export const DATA_TYPES = ['integer', 'floating', 'string', 'character', 'boolean'] as const;
export type DataType = (typeof DATA_TYPES)[number];
export const STRUCTURES = ['one-d', 'two-d', 'record'] as const;
export type Structure = (typeof STRUCTURES)[number];
export const SOURCES = ['plain', 'csv', 'xml'] as const;
export type Source = (typeof SOURCES)[number];

export type Level = 1 | 2 | 3;

export interface Scenario<T extends string> {
  id: string;
  /** The data, in one or two sentences. */
  prompt: string;
  answer: T;
  /** The one-line justification. */
  why: string;
  level: Level;
}

export const TYPE_SCENARIOS: readonly Scenario<DataType>[] = [
  // Integer
  { id: 'tickets', prompt: 'The number of tickets in an order at a Bendigo theatre.', answer: 'integer', why: 'Tickets are counted in whole numbers and added up, so an Integer suits.', level: 1 },
  { id: 'points', prompt: "A player's score in a game where every point is a whole number and scores are added together.", answer: 'integer', why: 'Whole numbers used in arithmetic are stored as an Integer.', level: 1 },
  { id: 'age', prompt: "A member's age in whole years, used to check whether they are 18 or over.", answer: 'integer', why: 'Age in whole years is a whole number that is compared and calculated with, so an Integer suits.', level: 2 },
  { id: 'laps', prompt: 'The number of laps a swimmer has completed in training.', answer: 'integer', why: 'Laps are counted in whole numbers, so an Integer suits.', level: 1 },
  { id: 'stock', prompt: 'How many units of a product are in stock. It goes up when stock arrives and down with each sale.', answer: 'integer', why: 'Stock is counted in whole units and changed by arithmetic, so an Integer suits.', level: 2 },
  { id: 'year-level', prompt: "A student's year level, from 7 to 12, used to work out how many years of school they have left.", answer: 'integer', why: 'It is a whole number used in a calculation (12 minus the year level), so an Integer suits.', level: 3 },
  // Floating point
  { id: 'price', prompt: 'The price of an item in a café, such as $4.95.', answer: 'floating', why: 'Currency has a fractional part (the cents), so it is stored as Floating point and shown to two decimal places.', level: 1 },
  { id: 'sprint', prompt: "A runner's 100 m time in seconds, such as 12.57.", answer: 'floating', why: 'The time has a fractional part, so it needs Floating point.', level: 1 },
  { id: 'average', prompt: "The average of a class's test marks, such as 72.5.", answer: 'floating', why: 'An average can have a fractional part even when every mark is whole, so Floating point suits.', level: 2 },
  { id: 'pay-rate', prompt: "A worker's hourly pay rate, such as $28.50, used to calculate their wages.", answer: 'floating', why: 'Currency has cents and is used in arithmetic, so Floating point to two decimal places suits.', level: 2 },
  { id: 'temperature', prompt: "A patient's temperature in degrees Celsius, such as 37.2.", answer: 'floating', why: 'The reading has a fractional part, so it needs Floating point.', level: 2 },
  // String
  { id: 'surname', prompt: "A customer's surname.", answer: 'string', why: 'A name is a sequence of characters, so a String suits.', level: 1 },
  { id: 'mobile', prompt: 'A mobile phone number, such as 0412 345 678.', answer: 'string', why: 'It starts with 0, which an Integer would drop, it contains spaces, and it is never used in arithmetic, so it is a String.', level: 2 },
  { id: 'email', prompt: "A member's email address.", answer: 'string', why: 'An email address mixes letters, digits and symbols, so a String suits.', level: 1 },
  { id: 'postcode', prompt: 'A postcode such as 0870, which is never used in calculations.', answer: 'string', why: 'Stored as an Integer, 0870 would lose its leading zero, and postcodes are never calculated with, so a String suits.', level: 3 },
  { id: 'product-code', prompt: 'A product code such as AB-2041.', answer: 'string', why: 'It mixes letters, a hyphen and digits, so it must be a String.', level: 2 },
  { id: 'invoice', prompt: 'An invoice number that must keep its leading zeros, such as 000417, and is only ever displayed and searched for.', answer: 'string', why: 'An Integer would drop the leading zeros, and the number is never used in arithmetic, so a String suits.', level: 3 },
  // Character
  { id: 'grade', prompt: "A student's grade, which is always one letter from A to E.", answer: 'character', why: 'The grade is always exactly one character, so Character is the precise choice.', level: 1 },
  { id: 'seat-row', prompt: "A theatre seat's row, which is always a single letter from A to M.", answer: 'character', why: 'The row is always exactly one letter, so Character suits.', level: 2 },
  { id: 'size', prompt: 'A T-shirt size code that is always exactly one of the letters S, M or L.', answer: 'character', why: 'The code is always one character, so Character suits.', level: 2 },
  { id: 'initial', prompt: "The first initial of a person's given name.", answer: 'character', why: 'An initial is exactly one letter, so Character suits.', level: 3 },
  { id: 'menu-key', prompt: 'The menu choice a user types, which is always exactly one key, such as Q to quit or H for help.', answer: 'character', why: 'The choice is always exactly one character, so Character suits.', level: 3 },
  // Boolean
  { id: 'paid', prompt: 'Whether a club member has paid their fees this year.', answer: 'boolean', why: 'There are only two states, paid or not paid, so a Boolean suits and can be used directly in a condition.', level: 1 },
  { id: 'booked', prompt: 'Whether a seat on a bus is booked.', answer: 'boolean', why: 'A seat is either booked or not: two states, so a Boolean suits.', level: 1 },
  { id: 'on-loan', prompt: 'Whether a library book is currently on loan.', answer: 'boolean', why: 'A book is either on loan or not: two states, so a Boolean suits.', level: 2 },
  { id: 'newsletter', prompt: 'Whether a customer wants to receive the newsletter.', answer: 'boolean', why: 'The answer is only ever yes or no, so a Boolean suits.', level: 2 },
  { id: 'terms', prompt: 'Whether a user has accepted the terms and conditions, checked in IF statements before an order is placed.', answer: 'boolean', why: 'Accepted or not is two states, and a Boolean can be tested directly in a condition.', level: 3 },
];

export const STRUCTURE_SCENARIOS: readonly Scenario<Structure>[] = [
  // One-dimensional array
  { id: 'class-scores', prompt: 'A teacher stores the 28 test scores for one class, all whole numbers, to find the highest.', answer: 'one-d', why: 'Many values of one type, each reached by a single index, suit a one-dimensional array.', level: 1 },
  { id: 'march-temps', prompt: 'An app stores the maximum temperature for each day of March: 31 values.', answer: 'one-d', why: 'One value per day, all the same type, reached by the day number: a one-dimensional array.', level: 1 },
  { id: 'quiz-key', prompt: 'A quiz stores the correct answer to each of its 10 questions as a single letter, in question order.', answer: 'one-d', why: 'Ten values of one type, each found by the question number, suit a one-dimensional array.', level: 2 },
  { id: 'team-names', prompt: "A cricket club stores the names of this week's 11 players in batting order.", answer: 'one-d', why: 'A list of values of one type (String), each found by its position, suits a one-dimensional array.', level: 2 },
  { id: 'rainfall', prompt: 'A weather station stores the rainfall total for each of the 12 months of a year.', answer: 'one-d', why: 'Twelve values of one type, reached by the month number, suit a one-dimensional array.', level: 1 },
  // Two-dimensional array
  { id: 'cinema', prompt: 'A cinema records whether each seat is booked for one session. It has 12 rows with 20 seats in each row.', answer: 'two-d', why: 'Each value is identified by two things, a row and a seat, and all are the same type, so a two-dimensional array suits.', level: 1 },
  { id: 'store-sales', prompt: 'A chain of 4 stores records its daily sales totals over 7 days, so that each total is found by store and day.', answer: 'two-d', why: 'Values of one type identified by a row (store) and a column (day) suit a two-dimensional array.', level: 1 },
  { id: 'noughts', prompt: 'A noughts and crosses game stores its 3 by 3 board, each square holding one character.', answer: 'two-d', why: 'The board is rows and columns of values of one type, so a two-dimensional array suits.', level: 2 },
  { id: 'student-tests', prompt: 'A teacher stores the marks of 25 students on 4 tests, all whole numbers, so that one mark is found by student and test.', answer: 'two-d', why: 'Each mark is identified by two indexes, student and test, and all marks are the same type: a two-dimensional array.', level: 2 },
  { id: 'timetable', prompt: 'A school timetable stores the subject code for each of 6 periods on each of 5 days.', answer: 'two-d', why: 'Each subject code is found by day and period, and every code is a String, so a two-dimensional array suits.', level: 3 },
  // Record
  { id: 'member', prompt: "A club stores one member's details: their name, their age in years and whether they have paid.", answer: 'record', why: 'The fields have different data types and are reached by name, so a record groups them.', level: 1 },
  { id: 'product', prompt: "A shop program holds one product's code, description, price and quantity in stock.", answer: 'record', why: 'One item with named fields of different types (String, Floating point, Integer) suits a record.', level: 1 },
  { id: 'booking', prompt: "A booking app holds one booking: the customer's name, the date, the number of people and the deposit paid.", answer: 'record', why: 'The fields are different types that belong to one booking, so a record suits.', level: 2 },
  { id: 'pet', prompt: "A vet's program holds one pet's name, species, age in years and weight in kilograms.", answer: 'record', why: "A pet's fields mix String, Integer and Floating point, and a record lets each be reached by name.", level: 2 },
  { id: 'book', prompt: "A library program holds one book's title, author, year published and whether it is on loan.", answer: 'record', why: "The fields mix Strings, an Integer and a Boolean, so an array (one type only) can't hold them: a record suits.", level: 3 },
];

export const SOURCE_SCENARIOS: readonly Scenario<Source>[] = [
  // Plain text
  { id: 'event-log', prompt: "A program keeps a log of events, one free-form message per line, such as 'Backup started at 2:14 am'.", answer: 'plain', why: 'The lines have no fields to separate, so a plain text file is enough.', level: 1 },
  { id: 'notes', prompt: 'A note-taking app saves each note exactly as the user typed it.', answer: 'plain', why: 'A note is just text with no fields or structure, so plain text suits.', level: 1 },
  { id: 'rules', prompt: "A game loads its welcome message and rules as paragraphs of text to display on screen.", answer: 'plain', why: 'Paragraphs for display have no fields, so plain text suits.', level: 2 },
  { id: 'release-notes', prompt: 'A developer keeps release notes as a few paragraphs describing each change.', answer: 'plain', why: 'Free-form paragraphs have no records or fields, so plain text suits.', level: 2 },
  { id: 'help-text', prompt: 'A program shows the text of a help page, read in one piece from a file.', answer: 'plain', why: 'The file is only text to display, with no fields to pick out, so plain text suits.', level: 3 },
  // CSV
  { id: 'results-export', prompt: "A teacher exports a spreadsheet of 300 students' results, one row per student with the same five columns, to load into a marking program.", answer: 'csv', why: 'Uniform records with the same fields in the same order suit a CSV file, which any spreadsheet can open.', level: 1 },
  { id: 'sensor', prompt: 'A sensor writes a reading every minute with the same four fields (time, temperature, humidity, pressure), and the file must stay as small as possible.', answer: 'csv', why: "Many uniform records and a need for a compact file suit CSV, since it doesn't repeat a tag around every value.", level: 2 },
  { id: 'product-list', prompt: 'A shop wants its product list to open in any spreadsheet program. Every product has the same fields.', answer: 'csv', why: 'A table of uniform records that opens in any spreadsheet suits a CSV file.', level: 1 },
  { id: 'transactions', prompt: 'A program imports 50,000 transaction records, all with the same fields in the same order, and file size matters.', answer: 'csv', why: 'Large sets of uniform records are compact as CSV, where each field is found by its position.', level: 2 },
  { id: 'member-list', prompt: "A club emails its membership list, one member per line with the same fields, so the treasurer can open it in a spreadsheet.", answer: 'csv', why: 'Uniform records for a spreadsheet suit a CSV file.', level: 3 },
  // XML
  { id: 'exchange', prompt: "Two organisations' systems exchange order data, and each value must be identifiable by its name rather than its position in a line.", answer: 'xml', why: "XML is self-describing: a tag names every value, so the other system doesn't need to know a column order.", level: 1 },
  { id: 'nested-orders', prompt: 'Each order holds a different number of items, and each item has its own fields nested inside the order.', answer: 'xml', why: 'XML elements can nest inside one another, so an order can hold any number of items.', level: 2 },
  { id: 'new-fields', prompt: 'New fields will be added to the records next year, and programs that read the file now must keep working without changes.', answer: 'xml', why: "XML is extensible: programs find elements by tag name, so they can ignore new tags they don't use.", level: 2 },
  { id: 'partner-feed', prompt: "A booking system sends data to a partner's system written by another team, and the file must describe itself so no separate documentation of field order is needed.", answer: 'xml', why: 'Each value sits between tags that name it, so an XML file describes itself.', level: 3 },
  { id: 'config', prompt: 'A settings file must label every setting with a tag that names it, and group related settings inside one another.', answer: 'xml', why: 'Named tags and nesting are what XML provides.', level: 3 },
];
