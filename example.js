var LogWatcher = require('./index.js');
var lw = new LogWatcher();
lw.on('game-start', console.log.bind(console, 'game-start'));
lw.on('game-over', console.log.bind(console, 'game-over:'));
lw.on('zone-change', console.log.bind(console, 'zone-change:'));
lw.on('spectate-start', console.log.bind(console, 'spectate-start:'));
lw.on('spectate-end', console.log.bind(console, 'spectate-end:'));
lw.start();
