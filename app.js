const Koa = require('koa2');
const http = require('http');
const { Server } = require("socket.io");
const Redis = require("ioredis");
const axios = require('axios').default;
const { CACHE_KEY_PRIFIX, redisConfig, API_URL } = require("./config");

const app = new Koa();
const server = http.createServer(app.callback());
const io = new Server(server);
const redis = new Redis(redisConfig);

const getCacheKey = (userId) => `${CACHE_KEY_PRIFIX}${userId}`;

const nsp = io.of('/chat');

nsp.use(async (socket, next) => {
  const { Authorization, userId } = socket.handshake.query;
  const res = await axios.get(`${API_URL}/api/user/chatAuth/${userId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization,
    },
  });
  if (res.data) {
    next();
  }
});

nsp.use(async (socket, next) => {
  const { id } = socket;
  const { userId } = socket.handshake.query;
  const key = getCacheKey(userId);
  const socketId = await redis.get(key);
  if (!socketId) {
    redis.set(key, id);
  }
  next();
});

nsp.on('connection', (socket) => {
  console.log('connected');
  socket.on('send', async (message) => {
    const { targetUserId } = message;
    const key = getCacheKey(targetUserId);
    const socketId = await redis.get(key);
    // socket.emit('msg', message);
    if (socketId) {
      socket.to(socketId).emit('msg', message);
    }
  });
});

server.listen(3000);
