var request = require('request');

var LogWatcher = require('hearthstone-log-watcher');
var logWatcher = new LogWatcher();

var buffer = '';
var twitch_user_name = 'cmtw105';
var start_time;
var end_time;
var version = '1.0'

var reset_buffer = function() {
  buffer = '';
}

var add_to_buffer = function(line) {
  buffer += '\n'+line;
}

var send_buffer = function() {
  end_time = Math.floor(Date.now())
  console.log(buffer);
  var url = 'https://alpha.clip.mn/1/hs_client_metadata/'

  var data = {
    twitch_user_name: twitch_user_name,
    start_time:  start_time,
    end_time: end_time,
    data: buffer
  }
  request.post({
    url: url,
    json: true,
    headers: {'content-type' : 'application/json'},
    body: data },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log("Success");
        console.log(body);
      } else{
        console.log("Fail");
        console.log(body);
      }
    }
  );
}

logWatcher.on('zone-change', function (data) {
  var line = Math.floor(Date.now()) + ': zone_change : ' + data.cardName + ' has moved from ' + data.fromTeam + ' ' + data.fromZone + ' to ' + data.toTeam + ' ' + data.toZone;
  add_to_buffer(line);
});

logWatcher.on('game-start', function (data) {
  start_time = Math.floor(Date.now())
  var friendly_player = data[0],
      enemy_player = data[1];

  add_to_buffer(Math.floor(Date.now()) +  ': game_start : version = ' + version);
  var line = Math.floor(Date.now()) + ": game_start : " + friendly_player.name + " v/s " + enemy_player.name;
  add_to_buffer(line);
  var line = Math.floor(Date.now()) + ": game_start : " + friendly_player.name + " has id = "  + friendly_player.id;
  add_to_buffer(line);
  var line = Math.floor(Date.now()) + ": game_start : " + enemy_player.name + " has id = "  + enemy_player.id;
  add_to_buffer(line);  
});

logWatcher.on('turn-change', function (data) {
  add_to_buffer(Math.floor(Date.now()) +  ': turn-change : turn = ' + data.value);
});

logWatcher.on('game-over', function (data) {
  var friendly_player = data[0],
      enemy_player = data[1];
  var line = Math.floor(Date.now()) + ": game_ended : " + friendly_player.name + " result = " + friendly_player.status;
  add_to_buffer(line);
  var line = Math.floor(Date.now()) + ": game_ended : " + enemy_player.name + " result = " + enemy_player.status;
  add_to_buffer(line);
  send_buffer();  
});


logWatcher.on('hero-update', function (data) {
  var line = Math.floor(Date.now()) + ': hero_update : player_id = ' + data.playerId + ' has hero = ' + data.heroName ;
  add_to_buffer(line);
  var friendly = '';
  if (data.friendly) {
    friendly = 'not';
  }
  var line =  Math.floor(Date.now()) + ': hero_update : player_id = ' + data.playerId + ' is ' + friendly + ' friendly';
  add_to_buffer(line);
});


console.log("starting log");
logWatcher.start();

