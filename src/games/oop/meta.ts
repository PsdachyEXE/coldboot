/** Registry text for `oop`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const OOP_ID = 'oop';
export const OOP_TITLE = 'Classes, objects and access';
export const OOP_GAME_KK: KkId[] = ['U3O1-KK07', 'U3O1-KK03'];
export const OOP_SUMMARY = 'Name OOP principles, complete object descriptions, choose access modifiers';

export const OOP_MAN = `oop drills object-oriented programming: the four principles, object descriptions and access modifiers.

Principles. Read a scenario and type the principle it shows:
  abstraction: modelling only the details the problem needs;
  encapsulation: bundling attributes with the methods that act on them, and hiding the attributes so other code goes through those methods;
  generalisation: the design step that moves features several classes share up into one superclass;
  inheritance: a subclass automatically receiving its superclass's attributes and methods.

Object descriptions. An object description lists the object's name, its properties with their data types, and its methods. One row is blank, marked with a question mark. Either type the missing data type in full (Integer, Floating point, String, Character or Boolean), or choose the row that belongs there from lettered options. A value the object stores is a property; an action it performs is a method.

Access modifiers. Read what a member needs and type public, private, protected or default:
  public: any code in the program can use it;
  private: only the class's own methods can use it;
  protected: the class and its subclasses can use it (in Java, its package can too, so these questions don't name Java);
  default: the access a member gets when no modifier is written. What it allows depends on the language, so a question that asks about package access says the program is in Java.

Example: "Vehicle's odometer attribute must be usable directly by its subclasses Car and Truck, but hidden from unrelated classes. Which access modifier suits odometer?" Type protected.

A round has 10 questions: four principles, three object descriptions and three access modifiers, mixed. On a phone, tap an answer below the prompt.

Difficulty: --easy uses the plainest scenarios and three options for a missing row, normal adds harder scenarios and four options, and --hard leaves out the plainest and blanks whole rows more often.

Usage: play oop [--easy|--hard]`;
