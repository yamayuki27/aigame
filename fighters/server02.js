const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname));

let worldData = {
    bases: [],
    turrets: [],
    items: []
};

function getRandomPos() {
    return { phi: Math.acos(2 * Math.random() - 1), theta: 2 * Math.PI * Math.random() };
}

function initWorld() {
    worldData.bases = Array.from({ length: 4 }, (_, i) => ({
        id: `base_${i}`, pos: getRandomPos(), hp: 8, active: true, isPlayer: (i === 0)
    }));
    worldData.turrets = Array.from({ length: 2 }, (_, i) => ({
        id: `turret_${i}`, pos: getRandomPos(), hp: 8, active: true
    }));
    worldData.items = Array.from({ length: 5 }, (_, i) => ({
        id: `item_${i}`, pos: getRandomPos(), active: true
    }));
}
initWorld();

let players = {};

io.on('connection', (socket) => {
    players[socket.id] = { id: socket.id, quat: [0, 0, 0, 1], hp: 100 };
    socket.emit('init_world', { world: worldData, players: players });
    socket.broadcast.emit('player_join_alert', socket.id);

    socket.on('update_move', (data) => {
        if (players[socket.id]) {
            players[socket.id].quat = data.quat;
            socket.broadcast.emit('player_moved', players[socket.id]);
        }
    });

    socket.on('object_hit', (data) => {
        const list = worldData[data.type];
        const obj = list.find(o => o.id === data.id);
        if (obj && obj.active) {
            if (data.type === 'items') { obj.active = false; }
            else { obj.hp--; if (obj.hp <= 0) obj.active = false; }
            io.emit('world_update', worldData);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('player_leave', socket.id);
    });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'fighters.html')));
http.listen(3000, () => console.log(`Server running at http://localhost:3000`));