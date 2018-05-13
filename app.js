////////Codigo por Fernando Ruiz Velasco  con el apoyo y el tutoria de addyosmani

const express = require('express')
 ,path = require('path')
 ,favicon = require('serve-favicon')
 ,logger = require('morgan')
 ,cookieParser = require('cookie-parser')
 ,bodyParser = require('body-parser')
 ,session = require('express-session')
 ,dotenv = require('dotenv')
 ,passport = require('passport')
 ,Auth0Strategy = require('passport-auth0')
 ,flash = require('connect-flash');

var  mongoose = require('mongoose')
, io = require('socket.io')
, mongoURI =  process.env.MONGOLAB_URI || 'mongodb://construtec.mx/todobreaker'
, Schema = mongoose.Schema
, ObjectID = Schema.ObjectId
, Todo = require('./models/todos.js').init(Schema, mongoose)
, http = require('http')
;

var connectWithRetry = function() {
  return mongoose.connect(mongoURI, function(err) {
    if (err) {
      console.error('Que chafa, me contectare cuando muera o en 5 segundos', err);
      setTimeout(connectWithRetry, 5000);
    }
  });
};

connectWithRetry();

mongoose.connection.on('open', function() {
  console.log("Perfecto si funciona MongoDb");
});

dotenv.load();

const routes = require('./routes/index');
const user = require('./routes/user');
const todobreaker = require('./routes/todobreaker');





// This will configure Passport to use Auth0
const strategy = new Auth0Strategy(
  {
    domain: "themindbreaker.auth0.com",
    clientID: "IcDamRBUbjLvRmSgucZ5jEOwsS6y3MwI",
    clientSecret: "3dtO3UddatBxzj0w-ND_2AWJxm1nrGe4WJmxv_tABk8Y5IoyLZ64mNCHrA3fYDyZ",
    callbackURL:
      process.env.AUTH0_CALLBACK_URL || 'https://difinal.now.sh/callback'
  },
  function(accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
  }
);

passport.use(strategy);

// you can use this section to keep a smaller payload
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


////////Express server

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'shhhhhhhhh',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());
app.use('/', routes);



////////!express






// Check logged in
app.use(function(req, res, next) {
  res.locals.loggedIn = false;
  if (req.session.passport && typeof req.session.passport.user != 'undefined') {
    res.locals.loggedIn = true;
  }
  next();
});

app.use('/', routes);
app.use('/user', user);
app.use('/todobreaker', todobreaker);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

var server = require('http').Server(app);


var sio = require('socket.io')(server);
//User online user count variable
var users = 0;

var address_list = new Array();

sio.sockets.on('connection', function (socket) {
  var address = socket.handshake.address;

  if (address_list[address]) {
    var socketid = address_list[address].list;
    socketid.push(socket.id);
    address_list[address].list = socketid;
  } else {
    var socketid = new Array();
    socketid.push(socket.id);
    address_list[address] = new Array();
    address_list[address].list = socketid;
  }

  users = Object.keys(address_list).length;

  socket.emit('count', { count: users });
  socket.broadcast.emit('count', { count: users });

  /*
    handles 'all' namespace
    function: list all todos
    response: all todos, json format
  */
  Todo.find({}, function(err, todos) {
    socket.emit('all',todos);
  });

  /*
    handles 'add' namespace
    function: add a todo
    Response: Todo object
  */
  socket.on('add', function(data) {
    var todo = new Todo({
      title: data.title,
      file: data.file,
      complete: false
    });
    console.log(todo);
    todo.save(function(err) {
      if (err) throw err;
      socket.emit('added', todo );
      socket.broadcast.emit('added', todo);
    });
  });

  /*
    Handles 'delete' namespace
    function: delete a todo
    response: the delete todo id, json object
  */
  socket.on('delete', function(data) {
    Todo.findById(data.id, function(err, todo) {
      todo.remove(function(err) {
        if (err) throw err;
        socket.emit('deleted', data );
        socket.broadcast.emit('deleted', data);
      });
    });
  });

  /*
    Handles 'edit' namespace
    function: edit a todo
    response: edited todo, json object
  */
  socket.on('edit', function(data) {
     Todo.findById(data.id, function(err, todo){
        todo.title = data.title;
        todo.save(function(err){
          if(err) throw err;
          socket.emit('edited', todo);
          socket.broadcast.emit('edited', todo);
        });
      });
  });

  /*
    Handles 'changestatus' namespace
    function: change the status of a todo
    response: the todo that was edited, json object
  */
  socket.on('changestatus', function(data) {
    Todo.findById(data.id, function(err, todo) {
      todo.complete = data.status == 'complete' ? true : false;
      todo.save(function(err) {
        if(err) throw err;
        socket.emit('statuschanged', data );
        socket.broadcast.emit('statuschanged', data);
      });
    });
  });

  /*
    Handles 'allchangestatus' namespace
    function: change the status of all todos
    response: the status, json object
  */
  socket.on('allchangestatus', function(data) {
    var master_status = data.status == 'complete' ? true : false;
    Todo.find({}, function(err, todos) {
      for(var i = 0; i < todos.length; i++) {
        todos[i].complete = master_status;
        todos[i].save(function(err) {
          if (err) throw err;
          socket.emit('allstatuschanged', data);
          socket.broadcast.emit('allstatuschanged', data);
        });
      }
    });
  });

  //disconnect state
  socket.on('disconnect', function() {
    var socketid = address_list[address].list;
    delete socketid[socketid.indexOf(socket.id)];
    if(Object.keys(socketid).length == 0) {
      delete address_list[address];
    }
    users = Object.keys(address_list).length;
    socket.emit('count', { count: users });
    socket.broadcast.emit('count', { count: users });
  });

});

module.exports = app;
server.listen(3000)
