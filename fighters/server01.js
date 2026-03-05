const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// --- 設定 ---
const PORT = 3000;
const MAX_PLAYERS = 4;

// 1. 静的ファイルの配信設定 (HTML, JS, 画像などを同じフォルダから読み込む)
app.use(express.static(__dirname));

// 2. ルートアクセス時の挙動
app.get('/', (req, res) => {
    // フォルダ内に fighters.html か fighter.html があるか確認して送信
    // (エラーを避けるため、存在する方を優先して返します)
    const fs = require('fs');
    if (fs.existsSync(path.join(__dirname, 'fighters.html'))) {
        res.sendFile(path.join(__dirname, 'fighters.html'));
    } else if (fs.existsSync(path.join(__dirname, 'fighter.html'))) {
        res.sendFile(path.join(__dirname, 'fighter.html'));
    } else {
        res.status(404).send('<h1>Error: HTML file not found</h1><p>fighters.html または fighter.html をサーバーと同じフォルダに置いてください。</p>');
    }
});

// 3. オンラインプレイヤーの管理
let players = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // 人数制限チェック
    if (Object.keys(players).length >= MAX_PLAYERS) {
        console.log(`Connection rejected: Server full (${MAX_PLAYERS} players)`);
        socket.emit('error_message', 'サーバーが満員です。');
        socket.disconnect();
        return;
    }

    // 新規プレイヤーの登録
    players[socket.id] = {
        id: socket.id,
        quat: [0, 0, 0, 1], // クォータニオン (回転情報)
        hp: 100
    };

    // 全プレイヤーに現在のリストを送信
    io.emit('player_list', players);

    // 自分以外の全員に「乱入者あり」を通知
    socket.broadcast.emit('player_join_alert', socket.id);

    // 位置情報の同期
    socket.on('update_move', (data) => {
        if (players[socket.id]) {
            players[socket.id].quat = data.quat;
            // 効率のため、自分以外の全員に座標をブロードキャスト
            socket.broadcast.emit('player_moved', players[socket.id]);
        }
    });

    // 切断時の処理
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete players[socket.id];
        // 全員に誰かが去ったことを通知
        io.emit('player_leave', socket.id);
    });
});

// 4. サーバー起動
http.listen(PORT, () => {
    console.log('-------------------------------------------');
    console.log(` Planet Fighter Server is running!`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Max Players: ${MAX_PLAYERS}`);
    console.log('-------------------------------------------');
    console.log('中止するには Terminal で Ctrl + C を押してください');
});