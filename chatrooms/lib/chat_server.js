const socketio = require('socket.io');
let io;
let guestNumber = 1;
let nickNames = {};
let nameUesd = [];
let currentRoom = {};

function assignGusetName(socket, guestNumber, nickNames, nameUesd)
{
  let name = 'Guest' + guestNumber;
  nickNames[socket.id] = name;
  socket.emit('nameResult', {
    success: true,
    name: name
  });
  nameUesd.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room)
{
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', {room: room});
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });
  let rooms = [], allRooms = io.sockets.adapter.rooms;
  for (let room in allRooms) {
    if (!allRooms[room].sockets.hasOwnProperty(room)) {
      rooms.push(room);
    }
  }
  io.sockets.emit('rooms', rooms);
}

function handleNameChangeAttempts(socket, nickNames, nameUesd)
{
  socket.on('nameAttempt', function(name)
  {
    if (name.indexOf('Guest') === 0)
    {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".'
      });
    }
    else
    {
      if (nameUesd.indexOf(name) === -1)
      {
        let previousName = nickNames[socket.id];
        let previousNameIndex = nameUesd.indexOf(previousName);
        nameUesd.push(name);
        nickNames[socket.id] = name;
        nameUesd.splice(previousNameIndex, 1);
        socket.emit('nameResult', {
          success: true,
          name: name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previousName + ' is now known as ' + name + '.'
        });
      }
      else
      {
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use.'
        });
      }
    }
  });
}

function handleMessageBroadcasting(socket)
{
  socket.on('message', function(message)
  {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text
    });
  })
}

function handleRoomJoining(socket)
{
  socket.on('join', function(room)
  {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnection(socket)
{
  socket.on('disconnect', function()
  {
    let nameIndex = nameUesd.indexOf(nickNames[socket.id]);
    nameUesd.splice(nameIndex, 1);
    delete nickNames[socket.id];
  });
}

exports.listen = function(server)
{
  io = socketio.listen(server);
  io.set('log level', 1);
  io.sockets.on('connection', function(socket)
  {
    guestNumber = assignGusetName(socket, guestNumber, nickNames, nameUesd);
    joinRoom(socket, 'mayadong');
    handleMessageBroadcasting(socket, nickNames);
    handleNameChangeAttempts(socket, nickNames, nameUesd);
    handleRoomJoining(socket);
    handleClientDisconnection(socket, nickNames, nameUesd);
    io.sockets.emit('rooms', ['mayadong']);
  });
}
