var LogWatcher = require('hearthstone-log-watcher');
var logWatcher = new LogWatcher();

logWatcher.on('zone-change', function (data) {
  console.log(Math.floor(Date.now() / 1000) + ': ' + data.cardName + ' has moved from ' + data.fromTeam + ' ' + data.fromZone + ' to ' + data.toTeam + ' ' + data.toZone);
});

logWatcher.on('game-start', function (data) {
  var friendly_player = data[0],
      enemy_player = data[1];

  console.log(Math.floor(Date.now() / 1000) + ": starting a game - " + friendly_player.name + " v/s " + enemy_player.name);
  console.log(Math.floor(Date.now() / 1000) + " " + friendly_player.name + " has id: "  + friendly_player.id);
  console.log(Math.floor(Date.now() / 1000) + " " + enemy_player.name + " has id: "  + enemy_player.id);
});

logWatcher.on('game-over', function (data) {
  var friendly_player = data[0],
      enemy_player = data[1];
  console.log("game ended - " + friendly_player.name + " result = " + friendly_player.status);
  console.log("game ended - " + enemy_player.name + " result = " + enemy_player.status);
});


logWatcher.on('hero-update', function (data) {
  console.log(Math.floor(Date.now() / 1000) + ': hero-update: ' + data.playerId + ' is hero: ' + data.heroName + ' is friendly: ' + data.friendly);
});




console.log('starting tracker.js')
logWatcher.start();

