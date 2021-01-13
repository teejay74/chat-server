const WebSocket = require("ws");
const User = require("./user");
const wsServer = new WebSocket.Server({ port: 7070 });

let delUser;

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
        delUser = message.user;
        await User.deleteUser(delUser);
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




