const express=require('express');
const mongoose =require('mongoose');
const app=express();
const expressLayouts = require('express-ejs-layouts');
const blog=require('./routes/blog.js');
const index= require('./routes/index.js');
const passport = require('passport');
const flash = require('connect-flash');
const session= require('express-session');


require('./config/passport')(passport);

mongoose.connect('mongodb://localhost:27017/blog')
    .then(()=>console.log('connected to mangodb......'))
    .catch(err=>console.error('could not connect to mongodb',err))

const db= mongoose.connection;

app.use(expressLayouts);
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));


app.use(
    session({
      secret: 'secret',
      resave: true,
      saveUninitialized: true
    })
  );
  

app.use(passport.initialize());
app.use(passport.session());

app.use(function(req,res,next){
  res.locals.currentUser = req.user;
  next();
})

app.use(flash());

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

app.use(express.json());


app.use('/blog', blog);
app.use('/', index);

app.use(express.static('public'));


const PORT=process.env.PORT || 3000;
app.listen(PORT,()=> console.log(`listening on port ${PORT}`));

