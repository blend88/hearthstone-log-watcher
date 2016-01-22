var LogWatcher = require('hearthstone-log-watcher');
var logWatcher = new LogWatcher();

logWatcher.on('zone-change', function (data) {
  console.log(Math.floor(Date.now() / 1000) + ': ' + data.cardName + ' has moved from ' + data.fromTeam + ' ' + data.fromZone + ' to ' + data.toTeam + ' ' + data.toZone);
});

logWatcher.on('game-start', function (data) {
  console.log("starting a game");
});

logWatcher.on('game-over', function (data) {
  console.log("game ended");
});




console.log('starting tracker.js')
logWatcher.start();

