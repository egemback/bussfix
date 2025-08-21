# Bussfix

An online card game for 2–6 players, created for **Promenadorquestern (PQ)** and **Baletten Paletten**, together with their friend orchestras **SMASK** and **Risk-SMASK**.

---

## Background / Bakgrund

### English

The card game was originally created by **Brunsås** and **Nfanta** during PQ’s _Pirate Tour_ on **June 8, 2024**.  
After a long and unexpected pause—caused by the tour bus overheating—PQ performed for Sweden’s then-current Prime Minister at a rest stop south of Stockholm.  
The journey continued to a Volvo repair workshop in Norrköping. There, two very bored and only partially sober individuals decided to solve the “bus problem.”  
Over the course of consuming a case of beer, the fantastic social game **Bussfix** was born.  
This digital version carries on that legacy, now adapted into _Bussfix_ for PQ, Baletten Paletten, SMASK, and Risk-SMASK.

### Svenska

Kortleken skapades ursprungligen av **Brunsås** och **Nfanta** under PQ:s _Pirate Tour_ den **8 juni 2024**.  
Efter en långdragen paus, på grund av att bussen överhettade, spelade PQ för Sveriges dåvarande statsminister vid en rastplats strax söder om Stockholm.  
Resan fortsatte sedan till en av Volvos reparationsverkstäder i Norrköping. Där satte sig två väldigt uttråkade och delvis nyktra individer ned för att lösa “bussproblemet.”  
Under kommande konsumtion av ett flak öl skapades det fantastiska sällskapsspelet **Bussfix**.  
Denna digitala version för vidare arvet, nu omdöpt till _Bussfix_ för PQ, Baletten Paletten, SMASK och Risk-SMASK.

---

## Features

- Play **locally** (pass-and-play) or **online** (rooms with Socket.IO).
- Full rules in Swedish and English, including all special combinations (69, KK, triple jacks, quadruple sixes, etc.).
- Configurable number of jokers (2–5) before each game starts.
- Modern UI built in React + TypeScript (easily portable to Angular if desired).
- Shared rule engine (`shared/`) used by both client and server.

---

## Installation

### Client (local play)

```bash
cd ./client
npm install
npm run dev
```

Open the printed address (often [http://localhost:5173](http://localhost:5173)).

### Server (for online rooms)

```bash
cd ./server
npm install
npm start
```

Server will start at [http://localhost:5174](http://localhost:5174).

Start the client and select **Online** in the lobby. Enter the server URL, a room ID, and your player name.

---

## Rules

### English

- You must always have at least **three cards** in hand. Start with three.
- If you have fewer than three cards, draw until you have three. If the deck is empty, draw from the player with the most cards (>3).
- If no other player has more than three cards, you are out of the game (which means you won).
- You must always play higher than the previous card(s).
- **Twos** can always be played; they reset the pile and the next player must play higher than two.
- If you cannot play, you must pick up the entire pile and drink.
- If four or more cards of the same value are played consecutively, everyone drinks.
- When a player finishes their drink, the pile is cleared (cards turned away).
- **Triple Jacks (3 or more)** → everyone drinks.
- **Quadruple Sixes (4 or more)** → waterfall (the player who played starts).
- **69 (6 on bottom, 9 on top)** → can be played on anything; next must beat a 9; everyone drinks.
- **Kings (2 or more)** → the player drinks and gives away one sip.
- **Three or more Sevens** → spin the bottle; the chosen player drinks.
- **Two or more Queens** → the sax section drinks.
- Multiple rules can apply at once (e.g., four Kings = KK rule + four of a kind rule).
- Jokers are wildcards: when played, the user chooses which card it represents.

### Svenska

- Man ska alltid ha minst **tre kort** på hand, starta med tre.
- Om man har färre än tre kort, dra tills man har tre. Om leken är slut: dra från den spelare som har flest kort (>3).
- Om ingen annan spelare har fler än tre kort är man ute ur spelet (dvs man vann).
- Man måste alltid lägga högre än tidigare lagda kort.
- **Tvåor** kan alltid läggas, de nollställer och nästa spelare måste lägga högre än tvåan.
- Om man inte kan lägga tar man upp alla korten från bordet och dricker.
- Om fyra kort eller fler av samma värde läggs i rad dricker alla.
- När en spelare druckit upp hela sin dricka vänds bordet bort (korten tas bort).
- **Trippelknull (3 knektar eller fler)** → drick.
- **Quadrupellsex (4 sexor eller fler)** → vattenfall, den som la börjar.
- **69 (6a under, 9a ovanpå)** → kan läggas på allt; nästa måste slå en nia; alla dricker.
- **Kungar (2 eller fler)** → spelaren dricker och delar ut en klunk.
- **Tre eller fler 7or** → snurra flaskan; den utvalde dricker.
- **Två eller fler damer** → saxsektionen dricker.
- Flera regler kan gälla samtidigt (t.ex. fyra kungar = KK-regeln + fyra i rad).
- Jokrar är wildcards – spelaren väljer värde när de spelas.

---

## Contributing

If you want to contribute improvements, feel free to open a PR or file an issue.

---

Created for PQ, Baletten Paletten, SMASK, and Risk-SMASK.
