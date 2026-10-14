/** Registry text for `oop`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const OOP_ID = 'oop';
export const OOP_TITLE = 'Classes, objects and access';
export const OOP_GAME_KK: KkId[] = ['U3O1-KK07', 'U3O1-KK03', 'U3O1-KK04', 'U4O1-KK03'];
export const OOP_SUMMARY = 'Name OOP principles, complete object descriptions, choose access modifiers';

export const OOP_MAN = `oop drills object-oriented programming: the four principles, object descriptions and access modifiers.

Principles. Read a scenario and type the principle it shows:
  abstraction: hiding complex detail and exposing only what is needed, starting from the attributes and behaviours the problem needs and leaving out the rest;
  encapsulation: keeping attributes together with the methods that use them in one class, and restricting direct access to the attributes (private attributes, read and changed through public get and set methods);
  generalisation: moving the attributes and methods that two or more classes share up into one more general superclass;
  inheritance: a subclass receiving its superclass's attributes and methods, which it can reuse, add to and override.

Object descriptions. An object description has three parts: the object's name, its properties/attributes with each data type in brackets after the name, such as isPaid (Boolean), and its methods, with any parameters in the brackets, such as restock(quantity). One row is blank, marked with a question mark. Either type the missing data type by its study design name (character, string, integer, floating point, date/time or Boolean), or choose the row that belongs there from lettered options. A value the object stores is a property; an action it performs is a method.

Access modifiers. Read what a member needs and type public, protected or private:
  public: any code in the program can use it;
  protected: the class and its subclasses can use it;
  private: only the class's own methods can use it.
Default is not one of the three, so it is never the answer.

Example: "Vehicle's odometer attribute must be usable directly by its subclasses Car and Truck, but hidden from unrelated classes. Which access modifier suits odometer?" Type protected.

A round has 10 questions: four principles, three object descriptions and three access modifiers, mixed. On a phone, tap an answer below the prompt.

Difficulty: --easy uses the plainest scenarios and three options for a missing row, normal adds harder scenarios and four options, and --hard leaves out the plainest and blanks whole rows more often.

Usage: play oop [--easy|--hard]`;
