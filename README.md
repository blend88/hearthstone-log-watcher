# Hearthstone Log Watcher

This module is simple. It takes care of the low-level monitoring of the Hearthstone log file and emits events based on what happens in the log file. Use this module if you want to build your own Hearthstone deck tracker and don't want to do the work of parsing through the nasty log file yourself.

## Usage

> $ npm install hearthstone-log-watcher

```javascript
var LogWatcher = require('hearthstone-log-watcher');
var logWatcher = new LogWatcher();

logWatcher.on('zone-change', function (data) {
  console.log(data.cardName + ' has moved from ' + data.fromTeam + ' ' + data.fromZone + ' to ' + data.toTeam + ' ' + data.toZone);
});

logWatcher.start();
```

Here's an example of the output from the above script:

> Knife Juggler has moved from FRIENDLY DECK to FRIENDLY HAND

Here's a little demo video as well:

[![](http://i.imgur.com/tKtxS8L.png)](http://www.youtube.com/watch?v=ccXEcKrZxu4)

### Parse an existing log file

`logWatcher.start()` begins reading any updates to the Hearthstone log file that occur after it has begun watching. If you need to parse a log from the beginning, you can use `parseBuffer`.

```javascript
var fs = require('fs');

fs.readFile('./my-old-player-log.log', function(err, buffer) {
  if (err) return console.error(err);
  logWatcher.parseBuffer(buffer);
});
```

## Methods

### start()

Starts watching the log file and parses any changes to it.

### stop()

Stops the watcher.

### parseBuffer(buffer [, parserState])

Parses a buffer (log file).

Useful if you have log files that you want to parse without watching them. See the usage example above for how to get the buffer from existing files.

The second argument, `parserState`, is optional, and will be created for you if you omit it.

If you want to use your own `parserState` instance it must have these properties:

* **players**: `Array` (keeps track of the players)
* **playerCount**: `Number` (keeps track of when players enter the game to know when to emit the start event)
* **gameOverCount**: `Number` (keeps track of when players won/lost/tied to know when the game is over)
* **reset**: `Function` (resets the `parserState` instance at the end of a game)

## Events

The available events you can listen for are as follows:

### **game-start**

The `game-start` event fires at the beginning of a match when the watcher has gathered enough data from the log to determine which of the two players is the local player. It was a lot more complicated to figure that out than one might think, so this event is pretty valuable because it eliminates the guess work. Not even the hearthstats deck tracker can determine what player is the local player ;)

Example Callback Arguments:

```javascript
{
  data: [
    {
      name: 'Hologrid',
      id: 1,
      entity: 1,
      team: 'FRIENDLY'
    },
    ...
  ],
  time: 1469196539000
}
```

### **game-over**

The `game-over` event fires at the end of a match and includes additional data showing who won and who lost.

Example Callback Arguments:

```javascript
{
  data: [
    {
      name: 'Hologrid',
      id: 1,
      entity: 1,
      team: 'FRIENDLY',
      status: 'WON'
    },
    ...
  ],
  time: 1469196539000
}
```


### **hero-update**

The `hero-update` event fires at the beginning of a match when heros are assigned to players.

Example callback argument:

```javascript
{
  data: {
    playerId: 1,
    heroName: '',
    friendly: 'FRIENDLY'
  },
  time: 1469196539000
}
```

### **zone-change**

The `zone-change` event fires whenever a game entity moves from one zone to another. Most entities are cards, but heroes and hero powers are also considered game entities and will show up in these events as well. I'm working on a way to filter those out, but they don't cause any problems currently other than just being useless data most of the time.

Hearthstone has 8 zones (that I'm aware of):

- DECK
- HAND
- PLAY
- PLAY (Hero)
- PLAY (Hero Power)
- PLAY (Weapon)
- SECRET
- GRAVEYARD

The "PLAY (Hero)" and "PLAY (Hero Power)" zones are pretty useless to us because the heroes and hero powers go into their respective play zones at the beginning of the game and don't usually go to the GRAVEYARD zone until the game is over. There is one exception that I'm aware of and that is Jaraxxus. Jaraxxus sends the Gul'dan hero and the Life Tap hero power to the GRAVEYARD zone when he is played, and then the Jaraxxus entity himself and his INFERNO! hero power enter the respective play zones.

The other zones are pretty straightforward. Cards in your deck are in the DECK zone. Cards in your hand are in the HAND zone. Minions on the board are in the PLAY zone. Secrets and weapons are in the SECRET and PLAY (Weapon) zones respectively. When writing a deck tracker UI it usually makes the most sense to consider PLAY, SECRET, and PLAY (Weapon) as a single zone; that way you can show visually whether a card is in your deck, your hand, in play, or destroyed.

The `zone-change` event receives an object as an argument with data that describes the event. It contains the card name, the card ID, the entity ID for that match, the team and zone the card came from, and the team and zone the card is moving to.

Example zone change data object:

```javascript
{
  data: {
    cardName: 'Knife Juggler',
    cardId: 'NEW1_019',
    entityId: 37,
    fromTeam: 'OPPOSING',
    fromZone: 'PLAY',
    toTeam: 'OPPOSING',
    toZone: 'GRAVEYARD'
  },
  time: 1469196539000
}
```

Don't be confused by the `entityId` field. The ID is not consistent across games. Rather, the entity ID is an identifier that is assigned to that specific card for the duration of just that match. It is what you need in order to track a card's status as the game progresses. For example, if you have two Knife Jugglers in your deck, you need to be able to tell which one is which. The entity ID is the only way to track changes to a specific card during that game. The `cardId` field never changes however, and you may use it to look up card data in a card database such as the one found at [HearthstoneJSON.com](http://hearthstonejson.com).

### **spectate-start**

Fired when you start spectating another game.

Callback Arguments:

- **time** - event timestamp

Example Callback Arguments:

```javascript
{ 
  time: 1469196539000 
}
```

### **spectate-end**

Fired when you stop spectating a game.

Callback Arguments:

- **time** - event timestamp

Example Callback Arguments:

```javascript
{ 
  time: 1469196539000 
}
```


### **turn-change**

Fired when ever the turn changes.

Example Callback Arguments:

```javascript
{ 
  data: {
    value: 6
  },
  time: 1469196539000 
}
```

## Frequently Asked Questions

#### Q. How do I see all the cards in my deck?

A. This module doesn't provide any functionality like that. This is just a log watcher that emits events that describe what it sees happening in the log. If you're building a deck tracker, you'll want to provide some kind of *deck builder* where users can fill out their deck beforehand. One helpful tool for this is [HearthstoneJSON.com](http://hearthstonejson.com/) where you can get a JSON blob of all the Hearthstone card data. You could use that JSON data to do a card name autocomplete input, making it super easy for users to build their deck in your tool.

#### Q. Did you build a deck tracker that uses your own log watcher module?

A. Why yes I did! You can find my Hearthpal Tracker [here](http://github.com/hearthpal/hearthpal-tracker).

#### Q. Why do some events seem to happen out of order?

A. This is not the fault of the log watcher. Hearthstone performs many things asynchronously even though the game appears to be very synchronous where things happen in a certain order. Unfortunately, Hearthstone does not always write to its own log file in the order in which things actually happened. For example, you may receive a game over event seconds before a card transition event, even if the transition occurred before the game ended. It's usually not a big deal but it's something to be aware of.
