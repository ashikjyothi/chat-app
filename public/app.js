angular.module('myApp',['ui.router'])
    .service('Session', function(){
        this.user = null;
        this.setUser = function(Ud,cb){
            console.log("Service setuser start")
            this.user = Ud.username;
            this.room = Ud.room;
            cb();

        }
    })
    .config(['$stateProvider','$urlRouterProvider',function($stateProvider,$urlRouterProvider){
        $urlRouterProvider.otherwise('/');
        $stateProvider
            .state('main',{
                url : '/'
            })
            .state('login',{
                url : '/login',
                views: {
                    'content': {
                        templateUrl : 'login.html'
                    }
                }
            })
            .state('chat',{
                url : '/chat',
                views: {
                    'content': {
                        templateUrl : 'chat.html'
                    }
                }
            })

    }])
    .run(function($rootScope,$state,Session){
        $rootScope.$on('$stateChangeStart', function(e, toState) {
			if (toState.url == '/') {
				if (Session.user) {
					e.preventDefault();
					$state.go('chat', {});
				} else {
					e.preventDefault();
					$state.go('login', {});
				}
			} else if (toState.url == '/chat') {
				if (!Session.user) {
					e.preventDefault();
					$state.go('login', {});
				}
			} else if (toState.url == '/login') {
				if (Session.user) {
					e.preventDefault();
					$state.go('chat', {});
				}
			}
		})
    })
    .service('Socket',function($timeout){
        var socket = io();

        this.emit = function(event,data,cb){
            console.log("Emitting::",event,data);
            socket.emit(event,data,function(response){
                if(cb){
                    $timeout(function(){
                        cb(response);
                    })
                    
                }
            });
        }

        this.on = function(event,callback){
            socket.on(event,function(cb){
                $timeout(function(){
                    callback(cb);
                })
            })
        }
    })
    .controller('loginController',['$scope','$location','Session','Socket',function($scope,$location,Session,Socket){
        console.log("Socket::",Socket);
        $scope.errorText = "";
        $scope.login = function(){
            var usrDetails = {username: $scope.username, room: $scope.room};
            // console.log("usrDetails:"+ usrDetails.username+" "+ usrDetails.room);

        Socket.emit('joinRoom',{
            name: usrDetails.username,
            room: usrDetails.room
        })

            


            Socket.emit('register',usrDetails,function(response){
                    console.log('login Response',response)
                    if(response == 'success'){
                        Session.setUser(usrDetails,function(response){
                            $location.path('/');
                        })
                    }
                    if(response == 'error'){
                        $scope.errorText = "Username already taken";
                    }
            });
        }
    }])
    .controller('chatController',['$scope','Socket','Session',function($scope,Socket,Session){
        $scope.user = Session.user;
        $scope.room = Session.room;
        $scope.sendMessage = function (text){
            console.log("sendMessage function start");
            if(text){
                var timestamp = moment().valueOf();
                var momentTime = moment.utc(timestamp);
                    momentTime = momentTime.local().format('h:mm a');

                var newMessage = {
                    sender : $scope.user,
                    text : text,
                    time : momentTime,
                    room : $scope.room
                }
            Socket.emit("chatMessage",newMessage,function(response){
                if(response == 'success'){
                    $scope.messages.push(newMessage)
                }
            });
            }
        }

        $scope.getMessages = function(){
        Socket.emit('getMessages',{},function(messages){
            console.log('Messages:',messages)
            $scope.messages = messages;
        })
        }
     $scope.getMessages();

     Socket.on('chatMessage',function(message){
         $scope.messages.push(message);
     })

    }])