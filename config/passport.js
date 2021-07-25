const LocalStratergy=require('passport-local');
const bcrypt=require('bcrypt');
const {User}=require('../models/models');

module.exports=function(passport){
    passport.use( 
        new LocalStratergy({usernameField:'username'},(username, password, done)=>{
            User.findOne({ username:username}).then(user=>{
                if(!user){
                    return done(null, false, {message:'username does not exists'})
                }
                
                bcrypt.compare(password, user.password,(err, isMatch)=>{
                    if(err) throw err;
                    if (isMatch){
                        return done(null , user);

                    }else{
                        return done(null, false,{message:'password incorrect'});
                    }
                });
            });
        })
    );
    passport.serializeUser(function(user,done){
        done(null, user.id);
    });
    passport.deserializeUser(function(id, done){
        User.findById(id, function(err, user){
            done(err, user);
        });
    });
}
