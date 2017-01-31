var express = require('express'),
    mongoose = require('mongoose'),
    socketio = require('socket.io'),
    http = require('http');
 var app = express();

 var server = http.createServer(app).listen(3000);

 var io = socketio.listen(server);

 app.use(express.static(__dirname + '/public'));

 


 mongoose.connect("mongodb://localhost:27017/chatapp", function(err){
     if(err)
     {
         console.log("Error connecting to database");
     }else{
         console.log("Mongo Working");
     }
 })

 var userSchema = mongoose.Schema({
     username : {
         type : String,
         unique : true
     }
 }); 

 var User = mongoose.model('User', userSchema);

 var chatSchema = mongoose.Schema({
     sender : String,
     text : String
 });

 var Chat =  mongoose.model('Chat', chatSchema);

 function addUser(un,cb){
     var newUser = new User({
         username : un
     })
     newUser.save(function(error, result){
         if(error){
             console.log("Error Saving Data",error)
             cb(error);
         }else {
             console.log("Username saved");
             cb("success");
         }
     })
 }

 function addMessage(message,cb){
     var newMsg = new Chat({
         sender : message.sender,
         text : message.text
     })
     newMsg.save(function(error,result){
         if(error){
             console.log("Error:",error);
         }else{
             console.log("Database messsage save:",result);
             cb('success');
         }
     })
 }

io.on('connection',function(socket){


    console.log("Connected");
    socket.on('register',function(username,fn){

        console.log("received register request")
        addUser(username,function(response){
            fn(response);
        })
    })
    socket.on('chatMessage',function(message,fn){
        addMessage(message,function(response){
            if(response == 'success'){
                socket.broadcast.emit('chatMessage',message)
                fn('success');
            }else {
                fn('error');
            }
        })
    })
    socket.on('getMessages',function(input,fn){
        Chat.find({},function(error,result){
            if(error){
                console.log("error:",error);
                fn(error);
            }else{
                console.log("getMessages result:",result);
                fn(result);
            }
        })
    })
    socket.on('disconnect',function(){

    })
    
})

app.get('/', function(req,res){
     res.sendFile('index.html',{
         root: path.join(__dirname, '/public')
     })
     

 })



 console.log("Server listening on port 3000");