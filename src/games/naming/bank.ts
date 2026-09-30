/**
 * The `naming` word bank: phrases to write in camel case or snake case, and the variables and
 * interface controls to name in Hungarian notation. Every phrase is lowercase words only, and none
 * of them written in camel case reads as Hungarian notation (the tests check each one).
 */
import type { ControlPrefix, VariablePrefix } from './conventions';

/** Plain phrases for camel case, snake case and the lookalikes, by number of words. */
export const PHRASES: readonly (readonly string[])[] = [
  ['total', 'cost'],
  ['first', 'name'],
  ['start', 'time'],
  ['delivery', 'fee'],
  ['high', 'score'],
  ['order', 'total'],
  ['seat', 'number'],
  ['due', 'date'],
  ['pass', 'mark'],
  ['player', 'count'],
  ['home', 'address'],
  ['booking', 'reference'],
  ['date', 'of', 'birth'],
  ['number', 'of', 'seats'],
  ['average', 'lap', 'time'],
  ['stock', 'on', 'hand'],
  ['maximum', 'group', 'size'],
  ['total', 'amount', 'owing'],
  ['home', 'phone', 'number'],
  ['last', 'login', 'date'],
  ['number', 'of', 'late', 'returns'],
  ['last', 'day', 'of', 'term'],
  ['minimum', 'age', 'for', 'entry'],
  ['total', 'cost', 'of', 'order'],
  ['average', 'daily', 'rainfall', 'total'],
];

export interface VariableEntry {
  prefix: VariablePrefix;
  words: readonly string[];
  /** What the variable holds, written so that the data type is clear without naming it. */
  data: string;
}

export const VARIABLES: readonly VariableEntry[] = [
  { prefix: 'str', words: ['surname'], data: "a customer's surname" },
  { prefix: 'str', words: ['email', 'address'], data: "a member's email address" },
  { prefix: 'str', words: ['phone', 'number'], data: 'a mobile phone number such as 0412 345 678' },
  { prefix: 'str', words: ['suburb'], data: 'the suburb in a delivery address' },
  { prefix: 'int', words: ['seat', 'count'], data: 'the number of seats booked' },
  { prefix: 'int', words: ['laps', 'completed'], data: 'the number of laps a swimmer has completed' },
  { prefix: 'int', words: ['quantity'], data: 'how many items are in an order' },
  { prefix: 'flt', words: ['unit', 'price'], data: 'the price of one item, such as 4.95' },
  { prefix: 'flt', words: ['average', 'mark'], data: "the average of a class's marks, such as 72.5" },
  { prefix: 'flt', words: ['hourly', 'rate'], data: "a worker's hourly pay rate, such as 28.50" },
  { prefix: 'bln', words: ['has', 'paid'], data: 'whether a member has paid their fees' },
  { prefix: 'bln', words: ['is', 'booked'], data: 'whether a seat is booked' },
  { prefix: 'bln', words: ['wants', 'newsletter'], data: 'whether a customer wants the newsletter' },
  { prefix: 'chr', words: ['grade'], data: "a student's grade, which is always one letter from A to E" },
  { prefix: 'chr', words: ['row', 'letter'], data: "a seat's row, which is always one letter from A to M" },
  { prefix: 'chr', words: ['size', 'code'], data: 'a size code that is always one of the letters S, M or L' },
  { prefix: 'arr', words: ['test', 'scores'], data: 'the test scores of every student in a class' },
  { prefix: 'arr', words: ['player', 'names'], data: 'the names of every player in a team' },
  { prefix: 'arr', words: ['monthly', 'rainfall'], data: 'the rainfall total for each month of the year' },
];

export interface ControlEntry {
  prefix: ControlPrefix;
  words: readonly string[];
  /** Completes "a text box ...", "a button ...". */
  what: string;
}

export const CONTROLS: readonly ControlEntry[] = [
  { prefix: 'txt', words: ['surname'], what: 'where the user types their surname' },
  { prefix: 'txt', words: ['quantity'], what: 'where the user types how many tickets they want' },
  { prefix: 'txt', words: ['email'], what: 'where the user types their email address' },
  { prefix: 'btn', words: ['save'], what: 'that saves the booking' },
  { prefix: 'btn', words: ['calculate', 'total'], what: 'that calculates the total' },
  { prefix: 'btn', words: ['cancel'], what: 'that cancels the order' },
  { prefix: 'lbl', words: ['total'], what: 'that shows the total cost' },
  { prefix: 'lbl', words: ['error', 'message'], what: 'that shows an error message' },
  { prefix: 'chk', words: ['newsletter'], what: 'that the user ticks to receive the newsletter' },
  { prefix: 'chk', words: ['accept', 'terms'], what: 'that the user ticks to accept the terms' },
  { prefix: 'lst', words: ['subjects'], what: 'that lists the subjects a student can choose' },
  { prefix: 'lst', words: ['results'], what: 'that lists the search results' },
  { prefix: 'cbo', words: ['suburb'], what: 'that lets the user pick their suburb from a drop-down list' },
  { prefix: 'cbo', words: ['state'], what: 'that lets the user pick their state from a drop-down list' },
  { prefix: 'rdo', words: ['cash'], what: 'that the user selects to pay in cash' },
  { prefix: 'rdo', words: ['delivery'], what: 'that the user selects to have the order delivered' },
  { prefix: 'frm', words: ['booking'], what: 'where customers make a booking' },
  { prefix: 'frm', words: ['login'], what: 'where users log in' },
];
