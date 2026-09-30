/**
 * The `oop` bank, written by hand: scenarios for the four principles, needs for the four access
 * modifiers, and object descriptions with gaps to complete. The rules the items rest on, at the
 * level of mainstream textbook meaning:
 *
 * - Abstraction models only the details the problem needs. Encapsulation bundles attributes with
 *   the methods that act on them and hides the attributes (private, reached through public
 *   methods). Generalisation is the design step that moves features several classes share into one
 *   superclass. Inheritance is the mechanism that then gives a subclass its superclass's attributes
 *   and methods. Abstraction scenarios never lean on hiding how a method works, which overlaps
 *   encapsulation.
 * - public: any code in the program. private: only the class's own methods. protected: the class
 *   and its subclasses; in Java, also its package, so protected scenarios never name Java.
 *   default: the access given when no modifier is written, which depends on the language; the
 *   scenarios that describe package access say the program is written in Java.
 * - An object description lists the object's name, its properties with data types, and its
 *   methods (named with brackets). Data types follow the `types` game's rules.
 */

export const PRINCIPLES = ['abstraction', 'encapsulation', 'generalisation', 'inheritance'] as const;
export type Principle = (typeof PRINCIPLES)[number];
export const MODIFIERS = ['public', 'private', 'protected', 'default'] as const;
export type Modifier = (typeof MODIFIERS)[number];

export type Level = 1 | 2 | 3;

export interface PrincipleScenario {
  id: string;
  prompt: string;
  answer: Principle;
  why: string;
  level: Level;
}

export const PRINCIPLE_SCENARIOS: readonly PrincipleScenario[] = [
  // Abstraction
  {
    id: 'patient-details',
    prompt: "A clinic's Patient class stores each patient's name, date of birth and appointment times, but not their hair colour or favourite food, because the booking system never uses them.",
    answer: 'abstraction',
    why: 'Modelling only the details the problem needs, and leaving out the rest, is abstraction.',
    level: 1,
  },
  {
    id: 'parking-vehicle',
    prompt: "For a car park app, the team's Vehicle class models only the registration, the vehicle type and the time it entered. Engine size and paint colour are left out.",
    answer: 'abstraction',
    why: "Choosing which real-world details to model, and ignoring those the car park doesn't need, is abstraction.",
    level: 1,
  },
  {
    id: 'library-book',
    prompt: 'The designers of a school library program ask which details of a book matter for borrowing, and model only its title, author, barcode and due date.',
    answer: 'abstraction',
    why: 'Reducing a book to the few details borrowing needs is abstraction.',
    level: 2,
  },
  {
    id: 'forecast',
    prompt: "A weather app's Forecast class represents a complex weather model with just the three things users need to see: the temperature, the chance of rain and the wind speed.",
    answer: 'abstraction',
    why: 'Presenting a complex system through only the details that matter to its users is abstraction.',
    level: 2,
  },
  {
    id: 'game-enemy',
    prompt: "A game's Enemy class models only the enemy's position, health and speed. Its made-up backstory is left out because it never affects play.",
    answer: 'abstraction',
    why: 'Keeping only the details that affect the program, and leaving out the rest, is abstraction.',
    level: 3,
  },
  // Encapsulation
  {
    id: 'bank-balance',
    prompt: 'A BankAccount class makes its balance attribute private. Other code can change the balance only by calling deposit() and withdraw(), which check each amount first.',
    answer: 'encapsulation',
    why: "Hiding an attribute and allowing changes only through the class's own methods is encapsulation.",
    level: 1,
  },
  {
    id: 'student-mark',
    prompt: "A Student class's mark attribute is private and can be changed only through setMark(), which rejects any value outside 0 to 100.",
    answer: 'encapsulation',
    why: 'A private attribute reached only through a method that validates the new value is encapsulation.',
    level: 1,
  },
  {
    id: 'ticket-bundle',
    prompt: 'The Ticket class bundles the fare attribute together with the calculateFare() method that works it out, and other classes can no longer set fare directly.',
    answer: 'encapsulation',
    why: 'Bundling data with the methods that act on it, and restricting direct access to the data, is encapsulation.',
    level: 2,
  },
  {
    id: 'player-score',
    prompt: "Other classes can read a Player's score through getScore(), but they can't change it, because the score attribute is private and there is no public method that sets it.",
    answer: 'encapsulation',
    why: "Controlling access to an attribute through the class's own public methods is encapsulation.",
    level: 2,
  },
  {
    id: 'group-size',
    prompt: 'The Booking class keeps groupSize private and provides setGroupSize(), which refuses any number below 1, so no other code can store an impossible group size.',
    answer: 'encapsulation',
    why: "Protecting an attribute's value by hiding it behind a checking method is encapsulation.",
    level: 3,
  },
  // Generalisation
  {
    id: 'vehicle-super',
    prompt: 'A designer notices that the Car and Truck classes both have registration and odometer attributes, so she moves them into a new Vehicle superclass.',
    answer: 'generalisation',
    why: 'Finding what several classes share and moving it up into one more general superclass is generalisation.',
    level: 1,
  },
  {
    id: 'person-super',
    prompt: 'Teacher and Student both have name, email and a login() method. The team creates a Person class to hold what the two share.',
    answer: 'generalisation',
    why: 'Creating a more general class from features that several classes share is generalisation.',
    level: 1,
  },
  {
    id: 'animal-super',
    prompt: 'While planning a zoo app, the team sees that the Lion, Penguin and Snake classes all have name, age and feed(), and designs an Animal superclass for these.',
    answer: 'generalisation',
    why: 'Grouping the shared features of several classes into one superclass during design is generalisation.',
    level: 2,
  },
  {
    id: 'account-super',
    prompt: 'SavingsAccount and ChequeAccount have the same accountNumber, balance and deposit(). The designer gathers these shared members into one Account class above them.',
    answer: 'generalisation',
    why: 'Moving shared members up into a more general class is generalisation.',
    level: 2,
  },
  {
    id: 'product-super',
    prompt: "An online shop's Book, Game and Toy classes all have a title and a price, so the designer moves those two attributes up into a Product class.",
    answer: 'generalisation',
    why: 'Identifying common attributes and placing them in a general superclass is generalisation.',
    level: 3,
  },
  // Inheritance
  {
    id: 'truck-sub',
    prompt: "The Truck class is declared as a subclass of Vehicle, so every Truck object has Vehicle's registration and odometer without them being written again in Truck.",
    answer: 'inheritance',
    why: "A subclass automatically gaining its superclass's attributes and methods is inheritance.",
    level: 1,
  },
  {
    id: 'express-sub',
    prompt: "ExpressDelivery is a subclass of Delivery. It gets Delivery's address and calculateCost() automatically, and adds its own guaranteedTime attribute.",
    answer: 'inheritance',
    why: "Receiving a superclass's members and adding new ones is inheritance.",
    level: 1,
  },
  {
    id: 'manager-sub',
    prompt: 'A Manager subclass receives every attribute and method of the Employee class, then overrides calculatePay() to add a bonus.',
    answer: 'inheritance',
    why: "A subclass receiving its superclass's members, and overriding one of them, is inheritance.",
    level: 2,
  },
  {
    id: 'kayak-sub',
    prompt: "Because Kayak is a subclass of Boat, a Kayak object can call Boat's launch() method, even though Kayak's own code doesn't define it.",
    answer: 'inheritance',
    why: 'Using a method defined in the superclass through a subclass object is inheritance.',
    level: 2,
  },
  {
    id: 'tutor-sub',
    prompt: "A new Tutor class is written as a subclass of Staff, so it starts with Staff's name, staffId and getPhone(), and only hourlyRate has to be added.",
    answer: 'inheritance',
    why: 'Starting from everything a superclass defines is inheritance.',
    level: 3,
  },
];

export interface AccessScenario {
  id: string;
  /** The need, ending with the question itself. */
  prompt: string;
  answer: Modifier;
  why: string;
  level: Level;
}

export const ACCESS_SCENARIOS: readonly AccessScenario[] = [
  // public
  {
    id: 'gui-total',
    prompt: 'The booking screen, which is a separate class, must call the calculateTotal() method of a Booking object. Which access modifier suits calculateTotal()?',
    answer: 'public',
    why: 'Code outside the class has to call it, so it must be public.',
    level: 1,
  },
  {
    id: 'get-balance',
    prompt: 'Any part of the program must be able to call getBalance() on an Account object. Which access modifier suits getBalance()?',
    answer: 'public',
    why: 'Public members can be used by any code in the program.',
    level: 1,
  },
  {
    id: 'print-ticket',
    prompt: "Several unrelated classes call a Ticket object's printTicket() method. Which access modifier suits printTicket()?",
    answer: 'public',
    why: 'Unrelated classes need it, so it must be public.',
    level: 2,
  },
  {
    id: 'get-score',
    prompt: "Other classes read a Player's score through getScore(), while the score attribute itself stays hidden. Which access modifier suits getScore()?",
    answer: 'public',
    why: 'The getter is how other classes read the hidden attribute, so the getter itself must be public.',
    level: 3,
  },
  // private
  {
    id: 'balance-attr',
    prompt: "A BankAccount's balance attribute must be changed only by the class's own deposit() and withdraw() methods. Which access modifier suits balance?",
    answer: 'private',
    why: "Private members can be used only by the class's own methods.",
    level: 1,
  },
  {
    id: 'mark-attr',
    prompt: "No other class, not even a subclass, may read or change a Student's mark directly; other code must use getMark() and setMark(). Which access modifier suits mark?",
    answer: 'private',
    why: 'Only private hides a member from every other class, including subclasses.',
    level: 2,
  },
  {
    id: 'check-pin',
    prompt: "checkPin() is a helper that only the Card class's own methods call. Which access modifier suits checkPin()?",
    answer: 'private',
    why: "A helper used only inside its own class should be private, so no other code comes to depend on it.",
    level: 2,
  },
  {
    id: 'password-hash',
    prompt: "A User object's passwordHash attribute must be reachable only by the User class's own methods. Which access modifier suits passwordHash?",
    answer: 'private',
    why: "Private restricts a member to the class's own methods.",
    level: 1,
  },
  // protected
  {
    id: 'odometer',
    prompt: "Vehicle's odometer attribute must be usable directly by its subclasses Car and Truck, but hidden from unrelated classes such as ParkingScreen. Which access modifier suits odometer?",
    answer: 'protected',
    why: 'Protected members can be used by the class and its subclasses, but not by unrelated classes.',
    level: 1,
  },
  {
    id: 'scale-helper',
    prompt: "The Shape class's scale() helper must be callable by its subclasses Circle and Square, but not by any other class. Which access modifier suits scale()?",
    answer: 'protected',
    why: 'Protected opens a member to subclasses while keeping it from unrelated classes.',
    level: 2,
  },
  {
    id: 'interest-rate',
    prompt: "Account's interestRate is used directly by its subclass SavingsAccount, and must be hidden from every class that isn't Account or one of its subclasses. Which access modifier suits interestRate?",
    answer: 'protected',
    why: "The class and its subclasses can use a protected member; other classes can't.",
    level: 2,
  },
  {
    id: 'base-pay',
    prompt: "Employee's basePay must be read directly by its subclasses Manager and Casual when they work out pay, and by no unrelated class. Which access modifier suits basePay?",
    answer: 'protected',
    why: 'Subclasses need direct access and unrelated classes must not have it, which is what protected gives.',
    level: 3,
  },
  // default
  {
    id: 'no-modifier',
    prompt: 'A programmer declares an attribute without writing any access modifier at all. What is that level of access called?',
    answer: 'default',
    why: "With no modifier written, the language's default access applies. What it allows depends on the language; in Java, it is access from the same package.",
    level: 2,
  },
  {
    id: 'java-package-method',
    prompt: 'The program is written in Java. The formatDate() method must be callable by other classes in the same package, but by no class outside that package, including subclasses in other packages. Which access modifier suits formatDate()?',
    answer: 'default',
    why: 'In Java, default (package) access, written as no modifier, opens a member to its own package only. Protected would also open it to subclasses in other packages.',
    level: 3,
  },
  {
    id: 'java-package-class',
    prompt: 'The program is written in Java. A helper class must be usable only by the other classes in its own package. Which access modifier suits the class?',
    answer: 'default',
    why: 'In Java, a class declared with no modifier has default (package) access, so only its own package can use it.',
    level: 3,
  },
];

export interface ObjectProperty {
  name: string;
  type: string;
  description: string;
}

/** One member to leave blank, with the need that describes it and three wrong options. */
export interface MemberGap {
  id: string;
  kind: 'property' | 'method';
  /** Completes "The Booking object needs a property to ..." or "... a method that ...". */
  need: string;
  /** The row as an option: "isPaid: Boolean" or "calculateTotal()". */
  answer: string;
  distractors: readonly [string, string, string];
  why: string;
}

export interface ObjectEntry {
  id: string;
  name: string;
  properties: readonly ObjectProperty[];
  methods: readonly string[];
  /** Properties whose data type is clear from the name and description, for type gaps. */
  typeGaps: readonly string[];
  memberGaps: readonly MemberGap[];
}

export const OBJECTS: readonly ObjectEntry[] = [
  {
    id: 'booking',
    name: 'Booking',
    properties: [
      { name: 'bookingId', type: 'Integer', description: 'Next number in sequence, e.g. 1047' },
      { name: 'customerName', type: 'String', description: "The customer's full name" },
      { name: 'kayakCount', type: 'Integer', description: 'Number of kayaks hired' },
      { name: 'deposit', type: 'Floating point', description: 'Amount paid upfront, e.g. 45.50' },
      { name: 'isPaid', type: 'Boolean', description: 'Whether the full amount has been paid' },
    ],
    methods: ['calculateTotal()', 'confirmBooking()', 'cancelBooking()'],
    typeGaps: ['customerName', 'kayakCount', 'deposit', 'isPaid'],
    memberGaps: [
      {
        id: 'total',
        kind: 'method',
        need: 'works out the total cost of the booking',
        answer: 'calculateTotal()',
        distractors: ['totalCost: Floating point', 'printReceipt()', 'refundDeposit()'],
        why: 'Working something out is an action, so it is a method, and calculateTotal() is the one that works out the cost.',
      },
      {
        id: 'paid',
        kind: 'property',
        need: 'record whether the full amount has been paid',
        answer: 'isPaid: Boolean',
        distractors: ['isPaid: String', 'payBooking()', 'amountPaid: Integer'],
        why: 'A value the object stores is a property, and paid or not paid is two states, so its type is Boolean.',
      },
    ],
  },
  {
    id: 'member',
    name: 'Member',
    properties: [
      { name: 'memberId', type: 'String', description: 'Letters and digits, e.g. GM0412' },
      { name: 'fullName', type: 'String', description: "The member's full name" },
      { name: 'age', type: 'Integer', description: 'Age in whole years' },
      { name: 'weeklyFee', type: 'Floating point', description: 'Charged each week, e.g. 14.95' },
      { name: 'hasPaid', type: 'Boolean', description: "Whether this week's fee has been paid" },
      { name: 'level', type: 'Character', description: 'Always one letter: B for basic or P for premium' },
    ],
    methods: ['renewMembership()', 'calculateFee()', 'printCard()'],
    typeGaps: ['memberId', 'age', 'weeklyFee', 'hasPaid', 'level'],
    memberGaps: [
      {
        id: 'card',
        kind: 'method',
        need: "prints the member's access card",
        answer: 'printCard()',
        distractors: ['cardNumber: String', 'printReceipt()', 'cancelMembership()'],
        why: 'Printing is an action, so it is a method, and printCard() is the one that prints the card.',
      },
      {
        id: 'fee',
        kind: 'property',
        need: 'store the fee charged each week, such as 14.95',
        answer: 'weeklyFee: Floating point',
        distractors: ['weeklyFee: Integer', 'chargeFee()', 'weeklyFee: Boolean'],
        why: 'A stored value is a property, and a fee with cents needs Floating point.',
      },
    ],
  },
  {
    id: 'ticket',
    name: 'Ticket',
    properties: [
      { name: 'ticketId', type: 'String', description: 'Letters and digits, e.g. TK-20931' },
      { name: 'fare', type: 'Floating point', description: 'Price paid, e.g. 12.40' },
      { name: 'isConcession', type: 'Boolean', description: 'Whether a concession fare applies' },
      { name: 'seatRow', type: 'Character', description: 'Always one letter from A to M' },
      { name: 'seatNumber', type: 'Integer', description: 'Seat number within the row' },
    ],
    methods: ['calculateFare()', 'printTicket()', 'cancelTicket()'],
    typeGaps: ['ticketId', 'fare', 'isConcession', 'seatRow'],
    memberGaps: [
      {
        id: 'row',
        kind: 'property',
        need: "record the seat's row, which is always one letter from A to M",
        answer: 'seatRow: Character',
        distractors: ['seatRow: Integer', 'chooseRow()', 'seatRow: Boolean'],
        why: 'A stored value is a property, and a value that is always exactly one letter is a Character.',
      },
      {
        id: 'fare',
        kind: 'method',
        need: 'works out the price of the ticket, applying the concession discount when it applies',
        answer: 'calculateFare()',
        distractors: ['discountRate: Floating point', 'refundTicket()', 'printReceipt()'],
        why: 'Working out the price is an action, so it is a method, and calculateFare() is the one that does it.',
      },
    ],
  },
  {
    id: 'product',
    name: 'Product',
    properties: [
      { name: 'productCode', type: 'String', description: 'Letters and digits, e.g. AB-2041' },
      { name: 'description', type: 'String', description: 'A short description of the product' },
      { name: 'price', type: 'Floating point', description: 'Price in dollars, e.g. 19.95' },
      { name: 'stockLevel', type: 'Integer', description: 'Number of units held' },
      { name: 'sizeCode', type: 'Character', description: 'Always one of the letters S, M or L' },
      { name: 'onSale', type: 'Boolean', description: 'Whether the product is discounted right now' },
    ],
    methods: ['restock()', 'applyDiscount()', 'updatePrice()'],
    typeGaps: ['productCode', 'price', 'stockLevel', 'sizeCode', 'onSale'],
    memberGaps: [
      {
        id: 'restock',
        kind: 'method',
        need: 'adds newly delivered units to the stock level',
        answer: 'restock()',
        distractors: ['deliveredUnits: Integer', 'sellProduct()', 'removeProduct()'],
        why: 'Adding delivered units is an action, so it is a method, and restock() is the one that does it.',
      },
      {
        id: 'stock',
        kind: 'property',
        need: 'record how many units are held, a whole number that goes up and down',
        answer: 'stockLevel: Integer',
        distractors: ['stockLevel: Boolean', 'countStock()', 'stockLevel: Character'],
        why: 'A stored count is a property, and a whole number used in arithmetic is an Integer.',
      },
    ],
  },
  {
    id: 'student',
    name: 'Student',
    properties: [
      { name: 'studentId', type: 'String', description: 'Always starts with S, e.g. S0012345' },
      { name: 'surname', type: 'String', description: "The student's surname" },
      { name: 'yearLevel', type: 'Integer', description: 'From 7 to 12' },
      { name: 'averageMark', type: 'Floating point', description: 'Mean of all marks, e.g. 72.5' },
      { name: 'grade', type: 'Character', description: 'Always one letter from A to E' },
      { name: 'isEnrolled', type: 'Boolean', description: 'Whether the student is currently enrolled' },
    ],
    methods: ['enrol()', 'calculateAverage()', 'printReport()'],
    typeGaps: ['studentId', 'averageMark', 'grade', 'isEnrolled'],
    memberGaps: [
      {
        id: 'average',
        kind: 'method',
        need: "works out the mean of the student's marks",
        answer: 'calculateAverage()',
        distractors: ['meanMark: Floating point', 'withdraw()', 'printTimetable()'],
        why: 'Working out the mean is an action, so it is a method, and calculateAverage() is the one that does it.',
      },
      {
        id: 'enrolled',
        kind: 'property',
        need: 'record whether the student is currently enrolled',
        answer: 'isEnrolled: Boolean',
        distractors: ['isEnrolled: String', 'enrolStudent()', 'enrolmentCount: Integer'],
        why: 'A stored value is a property, and enrolled or not is two states, so its type is Boolean.',
      },
    ],
  },
  {
    id: 'pet',
    name: 'Pet',
    properties: [
      { name: 'petName', type: 'String', description: "The pet's name" },
      { name: 'species', type: 'String', description: 'For example dog or cat' },
      { name: 'ageYears', type: 'Integer', description: 'Age in whole years' },
      { name: 'weightKg', type: 'Floating point', description: 'Weight in kilograms, e.g. 4.25' },
      { name: 'isDesexed', type: 'Boolean', description: 'Whether the pet has been desexed' },
    ],
    methods: ['bookCheckUp()', 'updateWeight()', 'printHistory()'],
    typeGaps: ['petName', 'ageYears', 'weightKg', 'isDesexed'],
    memberGaps: [
      {
        id: 'weight',
        kind: 'property',
        need: "store the pet's weight in kilograms, such as 4.25, used to work out medicine doses",
        answer: 'weightKg: Floating point',
        distractors: ['weightKg: Integer', 'weighPet()', 'weightKg: String'],
        why: 'A stored value is a property, and a weight with a fractional part that is used in calculations needs Floating point.',
      },
      {
        id: 'check-up',
        kind: 'method',
        need: 'books the pet in for its next check-up',
        answer: 'bookCheckUp()',
        distractors: ['nextCheckUp: String', 'cancelVisit()', 'printInvoice()'],
        why: 'Booking is an action, so it is a method, and bookCheckUp() is the one that books the visit.',
      },
    ],
  },
];
