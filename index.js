var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fs = require('fs');
var path = require('path');
var os = require('os');
var extend = require('extend');

var defaultOptions = {
  endOfLineChar: os.EOL
};

var debug = require('debug');
// Define some debug logging functions for easy and readable debug messages.
var log = {
  main: debug('HLW'),
  gameStart: debug('HLW:game-start'),
  zoneChange: debug('HLW:zone-change'),
  gameOver: debug('HLW:game-over')
};

// Determine the default location of the config and log files.
if (/^win/.test(os.platform())) {
  log.main('Windows platform detected.');
  var programFiles = 'Program Files';
  if (/64/.test(os.arch())) {
    programFiles += ' (x86)';
  }
  defaultOptions.logFile = path.join('C:', programFiles, 'Hearthstone', 'Hearthstone_Data', 'output_log.txt');
  defaultOptions.configFile = path.join(process.env.LOCALAPPDATA, 'Blizzard', 'Hearthstone', 'log.config');
} else {
  log.main('OS X platform detected.');
  defaultOptions.logFile = path.join(process.env.HOME, 'Library', 'Logs', 'Unity', 'Player.log');
  defaultOptions.configFile = path.join(process.env.HOME, 'Library', 'Preferences', 'Blizzard', 'Hearthstone', 'log.config');
}

// The watcher is an event emitter so we can emit events based on what we parse in the log.
function LogWatcher(options) {
    this.options = extend({}, defaultOptions, options);

    log.main('config file path: %s', this.options.configFile);
    log.main('log file path: %s', this.options.logFile);

    // Copy local config file to the correct location.
    // We're just gonna do this every time.
    var localConfigFile = path.join(__dirname, 'log.config');
    fs.createReadStream(localConfigFile).pipe(fs.createWriteStream(this.options.configFile));
    log.main('Copied log.config file to force Hearthstone to write to its log file.');
}
util.inherits(LogWatcher, EventEmitter);

LogWatcher.prototype.start = function () {
  var self = this;

  var parserState = new ParserState;

  log.main('Log watcher started.');
  // Begin watching the Hearthstone log file.
  var fileSize = fs.statSync(self.options.logFile).size;
  fs.watchFile(self.options.logFile, {persistent: true, interval: 1000 }, function (current, previous) {
    if (current.mtime <= previous.mtime) { return; }

    // We're only going to read the portion of the file that we have not read so far.
    var newFileSize = fs.statSync(self.options.logFile).size;
    var sizeDiff = newFileSize - fileSize;
    if (sizeDiff < 0) {
      fileSize = 0;
      sizeDiff = newFileSize;
    }
    var buffer = new Buffer(sizeDiff);
    var fileDescriptor = fs.openSync(self.options.logFile, 'r');
    fs.readSync(fileDescriptor, buffer, 0, sizeDiff, fileSize);
    fs.closeSync(fileDescriptor);
    fileSize = newFileSize;

    self.parseBuffer(buffer, parserState, current.mtime.getTime());
  });

  self.stop = function () {
    fs.unwatchFile(self.options.logFile);
    delete self.stop;
  };
};

LogWatcher.prototype.stop = function () {};

LogWatcher.prototype.parseBuffer = function (buffer, parserState, currentTime) {
  var self = this;

  if (!parserState) {
    parserState = new ParserState;
  }

  // Iterate over each line in the buffer.
  buffer.toString().split(this.options.endOfLineChar).forEach(function (line) {

    // Check for player entityID. This will allow us to map playername with playerID
    var playerEntityRegex = /\[Power\] GameState.DebugPrintPower\(\) -\s*Player EntityID=(.) PlayerID=(.) GameAccountId=/
    if (playerEntityRegex.test(line)) {
        var parts = playerEntityRegex.exec(line);
        var entityId = parseInt(parts[1]);
        var playerId = parseInt(parts[2]);
        parserState.players.push({
            entity: entityId,
            id: playerId
        });
    }

    // Check if a card is changing zones.
    var zoneChangeRegex = /^\[Zone\] ZoneChangeList.ProcessChanges\(\) - id=\d* local=.* \[name=(.*) id=(\d*) zone=.* zonePos=\d* cardId=(.*) player=(\d)\] zone from ?(FRIENDLY|OPPOSING)? ?(.*)? -> ?(FRIENDLY|OPPOSING)? ?(.*)?$/
    if (zoneChangeRegex.test(line)) {
      var parts = zoneChangeRegex.exec(line);
      var data = {
        cardName: parts[1],
        entityId: parseInt(parts[2]),
        cardId: parts[3],
        playerId: parseInt(parts[4]),
        fromTeam: parts[5],
        fromZone: parts[6],
        toTeam: parts[7],
        toZone: parts[8]
      };
      if (data.toZone == 'PLAY (Hero)') {
        var dataToSend = {playerId: data.playerId,
                          heroName: data.cardName,
                          friendly: data.toTeam == 'FRIENDLY'};
        self.emit('hero-update', {data: dataToSend, time: currentTime});
      }

      log.zoneChange('%s moved from %s %s to %s %s.', data.cardName, data.fromTeam, data.fromZone, data.toTeam, data.toZone);
      self.emit('zone-change', {data: data, time: currentTime});
    }

    // Check for players entering play and track their team IDs.
    var newPlayerRegex = /TAG_CHANGE entity=\[id=(.) cardId= name=(.*)\] tag=PLAYSTATE value=PLAYING/;
    if (newPlayerRegex.test(line)) {
      var parts = newPlayerRegex.exec(line);
      var entityId = parseInt(parts[1]);
    
        //match player name with playerid
        parserState.players.forEach(function (player) {
            if (player.entity === entityId) {
                player.name = parts[2];
            }
        });
      
      parserState.playerCount++;
      
      if (parserState.playerCount === 2) {
        log.gameStart('A game has started.');
        self.emit('game-start', {data: parserState.players, time: currentTime});
      }
    }

    // Check if the game is over.
    var gameOverRegex = /\[Power\] GameState\.DebugPrintPower\(\) - TAG_CHANGE Entity=(.*) tag=PLAYSTATE value=(LOST|WON|TIED)$/;
    if (gameOverRegex.test(line)) {
      var parts = gameOverRegex.exec(line);
      // Set the status for the appropriate player.
      parserState.players.forEach(function (player) {
        if (player.name === parts[1]) {
          player.status = parts[2];
        }
      });
      parserState.gameOverCount++;
      // When both players have lost, emit a game-over event.
      if (parserState.gameOverCount === 2) {
        log.gameOver('The current game has ended.');
        self.emit('game-over', {data: parserState.players, time: currentTime});
        parserState.reset();
      }
    }

    // Check for turn
    var turnChange = /\[Power\] GameState\.DebugPrintPower\(\) -\s*TAG_CHANGE Entity=(.*) tag=TURN value=(.*)$/;
    if (turnChange.test(line)) {
      var parts = turnChange.exec(line);
      var turnChangeData = { value: parts[2]};
      self.emit('turn-change', {data: turnChangeData, time: currentTime});
    }

    // Check for spectacting
    var spectateStart = /Start Spectator Game/;
    if (spectateStart.test(line)) {
      self.emit('spectate-start', {time: currentTime});
    }

    var spectateEnd = /End Spectator Game/;
    if (spectateEnd.test(line)) {
      self.emit('spectate-end', {time: currentTime});
    }

  });
};

function ParserState() {
  this.reset();
}

ParserState.prototype.reset = function () {
  this.players = [];
  this.playerCount = 0;
  this.gameOverCount = 0;
};


// Set the entire module to our emitter.
module.exports = LogWatcher;
