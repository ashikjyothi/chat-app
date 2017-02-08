var express = require('express'),
    mongoose = require('mongoose'),
    socketio = require('socket.io'),
    moment = require('moment'),
    http = require('http');
var app = express();
var server = http.createServer(app).listen(3000);
var io = socketio.listen(server);

app.use(express.static(__dirname + '/public'));
var clientInfo = {};
mongoose.connect("mongodb://localhost:27017/chatapp", function(err) {
    if (err) {
        console.log("Error connecting to database");
    } else {
        console.log("Mongo Working");
    }
})
var userSchema = mongoose.Schema({
    socketid: String,
    username: {
        type: String,
        unique: true
    },
    room: String
});
var User = mongoose.model('User', userSchema);
var chatSchema = mongoose.Schema({
    sender: String,
    text: String,
    time: String,
    room: String
});
var Chat = mongoose.model('Chat', chatSchema);

function addUser(un, cb) {
    var newUser = new User({
        socketid: un.socketid,
        username: un.username,
        room: un.room
    })
    newUser.save(function(error, result) {
        if (error) {
            console.log("Error Saving Data", error)
            cb("error");
        } else {
            console.log("Username saved");
            cb("success");
        }
    })
}

function addMessage(message, cb) {
    var newMsg = new Chat({
        sender: message.sender,
        text: message.text,
        time: message.time,
        room: message.room
    })
    newMsg.save(function(error, result) {
        if (error) {
            console.log("Error:", error);
        } else {
            // console.log("Database messsage save:",result);
            cb('success');
        }
    })
}
io.on('connection', function(socket) {
    var socketID = socket.id;
    socket.on('initSocket', function(user) {
        console.log("NEW SOCKET ID::" + socket.id);
        User.findOne({
            username: user
        }, function(err, user) {
            if (user) {
                user.socketid = socket.id;
                user.save(function(err) {
                    if (err) {
                        console.error('ERROR!');
                    }
                });
            }
        });
    })
    socket.on('joinRoom', function(req) {
        clientInfo.socketID = {
            name: req.name,
            room: req.room
        };
        socket.join(req.room);
        socket.broadcast.to(req.room).emit('chatMessage', {
            sender: "System",
            text: req.name + " has joined chat!",
            time: "",
            room: req.room
        })
    })
    console.log("Connected");
    socket.on('register', function(Ud, fn) {
        Ud.socketid = socketID;
        // console.log("Ud.socketID:"+Ud.socketid);
        console.log("received register request")
        addUser(Ud, function(response) {
            fn(response);
        })
    })
    socket.on('PrivateMsg', function(pm, fn) {
        console.log("Received emitted privatemsg from:" + pm.user);
        User.find({
            username: pm.user
        }, function(err, result) {
            if (err) {
                console.log("Private message not send-Invalid User");
            } else {
                console.log("Array length:" + result.length);
                console.log("Private User name::" + result[0].username);
                var socketID = result[0].socketid;
                console.log("Private User SocketID::" + result[0].socketid);
                io.to(socketID).emit('chatMessage', {
                    sender: pm.sender,
                    text: pm.msg,
                    time: "Private Message",
                    room: pm.room
                })
                fn(result);
            }
        })
    })
    socket.on('chatMessage', function(message, fn) {
        addMessage(message, function(response) {
            if (response == 'success') {
                socket.broadcast.emit('chatMessage', message)
                fn('success');
            } else {
                fn('error');
            }
        })
    })
    socket.on('getMessages', function(input, fn) {
        Chat.find({}, function(error, result) {
            if (error) {
                console.log("error:", error);
                fn(error);
            } else {
                //console.log("getMessages result:",result);
                fn(result);
            }
        })
    })
    socket.on('logout', function(user, cb) {
        if (socket.id) {
            User.remove({
                socketid: socket.id
            }, function(err, res) {
                if (err) {
                    console.log('User remove err:::', err)
                } else {
                    cb();
                }
            });
        }
        console.log('disconnect')
 
    })
})
app.get('/', function(req, res) {
    res.sendFile('index.html', {
        root: path.join(__dirname, '/public')
    })
})
console.log("Server listening on port 3000");