const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const Router = require('koa-router');
const WebSocket = require('ws');
const User = require('./user');

const app = new Koa();
const router = new Router();

app.use(async (ctx, next) => {
    const origin = ctx.request.get('Origin');
    if (!origin) {
      return await next();
    }

    const headers = { 'Access-Control-Allow-Origin': '*', };

    if (ctx.request.method !== 'OPTIONS') {
      ctx.response.set({...headers});
      try {
        return await next();
      } catch (e) {
        e.headers = {...e.headers, ...headers};
        throw e;
      }
    }

    if (ctx.request.get('Access-Control-Request-Method')) {
      ctx.response.set({
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
      });

      if (ctx.request.get('Access-Control-Request-Headers')) {
        ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
      }

      ctx.response.status = 204;
    }
  });

app.use(koaBody({
    urlencoded: true,
    multipart: true,
    text: true,
    json: true,
}));

router.get('/index', async (ctx) => {
    ctx.response.body = 'hello';
});

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WebSocket.Server({ server });

let removeUser;

wsServer.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    const message = JSON.parse(msg);

    switch (message.type) {
      case "newUser":
        const user = await User.getName(message.user);
        if (!user) {
          const newUser = new User(message.user);
          await newUser.saveUser();
          const users = await User.getUsers();
          [...wsServer.clients]
            .filter((o) => o.readyState === WebSocket.OPEN)
            .forEach((o) =>
              o.send(JSON.stringify({ type: "users", data: users }))
            );
          return;
        }
        ws.send(JSON.stringify({ type: "alreadyName" }));
        break;
      case "newMessage":
        [...wsServer.clients]
          .filter((o) => o.readyState === WebSocket.OPEN)
          .forEach((o) => o.send(JSON.stringify({ type: "newMessage", data: message }))
          );
          break;
      case "exitUser":
        removeUser = message.user;
        await User.deleteUser(removeUser);
        const users = await User.getUsers();
        [...wsServer.clients]
          .filter((o) => o.readyState === WebSocket.OPEN)
          .forEach((o) =>
            o.send(JSON.stringify({ type: "users", data: users }))
          );
        break;
    }
  });

  ws.on("close", () => {
    console.log("closed chat");
    [...wsServer.clients]
      .filter((o) => o.readyState === WebSocket.OPEN)
      .forEach((o) =>
        o.send(JSON.stringify({ type: "disconnect", data: `${delUser} вышел` }))
      );
    ws.close();
  });

  [...wsServer.clients]
    .filter((o) => o.readyState === WebSocket.OPEN)
    .forEach((o) =>
      o.send(
        JSON.stringify({
          type: "connect",
          data: "новый пользователь присоединился к чатику"
        })
      )
    );
});

app.use(router.routes()).use(router.allowedMethods());
server.listen(port);





