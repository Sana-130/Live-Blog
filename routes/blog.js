const { User,  Post , Comment } = require('../models/models');
const express = require('express');
const passwordComplexity = require("joi-password-complexity");
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const _ = require('lodash');
const passport = require('passport');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const multer=require('multer');
const path=require('path');
const router = express.Router();
const showdown= require('showdown');
const sharp = require('sharp');
const fs = require('fs');


router.get('/signup', forwardAuthenticated, (req, res) => {
    res.render('signup',
        options = {
            layout: "blank-layout"
    });
});

router.post('/signup',
    body('username').isLength({ min: 4 }).withMessage('please provide a Valid Username'),
    body('email').isEmail().withMessage('please provide a valid Email'),

    body('password').isLength({ min: 8 }).withMessage('password should be min 8 character long '),
    body('password2').isLength({ min: 8 }).withMessage('please confirm your password'),
  
    async (req, res) => {
        const errors = validationResult(req);
        console.log("hey");
        if (!errors.isEmpty()) {
            const { username, email, password, password2 } = req.body;
            const extractedErrors = []
            errors.array({ onlyFirstError: true }).map(err => extractedErrors.push(err.msg));
            res.render('signup',  {
                errors: extractedErrors[0],
                username,
                email,
                password,
                password2,
                layout: "blank-layout"

            })
        }
        if (errors.isEmpty()) {
            const { username, email, password, password2 } = req.body;
            const label = "Password";
            const { error } = passwordComplexity(undefined, label).validate(password);
            if (error) {
                res.render('signup', {
                    errors: error.message,
                    username,
                    password,
                    password2,
                    layout: "blank-layout"
                    })
            }
            const user = await User.findOne({ email: email });
            const name = await User.findOne({ username: username });
            if (user || name) {
                if (user) {
                    res.render('signup', {
                        errors: 'email already registered',
                        username,
                        password,
                        password2,
                        layout: "blank-layout"
                    })
                }
                if (name) {
                    res.render('signup', {
                        errors: 'sry that username already exists',
                        email,
                        password,
                        password2,
                        layout: "blank-layout"
                        
                    })
                }

            }


            else {
                
                if (password != password2) {
                    res.render('signup', {
                        errors: 'passwords does not match',
                        layout: "blank-layout"
                    })

                }
               
                else {
                    try {
                        newuser = new User(_.pick(req.body, ['username', 'email', 'password']));
                        const salt = await bcrypt.genSalt(10);
                        newuser.password = await bcrypt.hash(password, salt);
                        await newuser.save();
                        req.flash(
                            'success_msg',
                            'You are now registered and can log in'
                        );
                        res.redirect('/blog/login');
                    }
                    catch (ex) {
                        console.log('exception', ex)
                    }

                }
            }
        }
    }
)
// login the user
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('login',
    options = {
        layout: "blank-layout"
    });
})
// checking the login status
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/blog/login',
        failureFlash: true
    })(req, res, next);
});
// logging out the user
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('succes_msg', 'you are logged in');
    res.redirect('/blog/login')

})
// profile page
router.get('/me', ensureAuthenticated, async(req, res) => {
    posts= await Post.find({ 'user.username': req.user.username})
    res.render('profile', {
        user: req.user,
        post:posts.length
        
    })
})
//
//following a user
router.get('/user/:name/follow', ensureAuthenticated, async(req, res)=>{
    followinguser=await User.findOne({username: req.params.name});
    console.log(followinguser._id);
    if(req.user.followingusers.includes(followinguser._id)){
        res.redirect('/blog/user/'+req.params.name);
    }
    else{
    await User.findByIdAndUpdate(req.user.id, {$push:{followingusers: followinguser._id}},
        { new: true, useFindAndModify: false });
    await followinguser.follower.push(req.user._id);
    await followinguser.notifications.push({
        message: `you are having a new follwer ${req.user.username}`,
        link: `/blog/user/${req.user.username}`
    })
        await followinguser.save();
        res.redirect('/blog/user/'+req.params.name);
    
}
})
// unfollowing a user
router.get('/user/:name/unfollow', ensureAuthenticated, async(req, res)=>{
    followinguser=await User.find({username: req.params.name});
    if(req.user.followingusers.includes(followinguser[0]._id)){
    await User.findByIdAndUpdate(req.user._id, { $pull: { followingusers:  followinguser[0]._id } },
        { new: true })
        res.redirect('/blog/user/'+req.params.name);
    }
    else{
        res.redirect('/blog/user/'+req.params.name);
    }
})
// getting a specific user
router.get('/user/:name' , ensureAuthenticated, async(req, res)=>{
    followinguser= await User.find({username: req.params.name});
    isfollow=req.user.followingusers.includes(followinguser[0]._id);
    frienduser=[]
    await req.user.followingusers.forEach(myfunction)
    async function myfunction(value, index, array){
        if(followinguser[0].follower.includes(value)){
            t=await User.find({_id:value})
            frienduser.push(t[0].username)
        }
        else{
            console.log('no')
        }
    }
    posts=await Post.find({'user.username': req.params.name}).sort({createdAt:-1})
    res.render('user',{
        posts,
        user: followinguser[0],
        frienduser,
        isfollow
    });
    
    
})
//liking a post
router.post('/posts/:id/like', ensureAuthenticated, async(req, res) => {
post=await Post.findOne({_id:req.params.id});
if(req.body.counter==1){
    console.log(req.body.counter);
    if(req.user.likedPosts.includes(req.params.id)){
        res.redirect('/');
    }
    else{
        await post.likes++;
    
        await User.findByIdAndUpdate(req.user._id, { $push: { likedPosts: req.params.id } })
        postauthor = post.user._id;
        await User.findByIdAndUpdate(postauthor, {
            $push: {
                notifications: {
                    message: `your post is liked By ${req.user.username}`,
                    link: `/blog/user/${req.user.username}`
                }
            }
        }, { new: true, useFindAndModify: false });
        await post.save();
        return res.send(post.likes.toString());

    }

}
});
//unliking a post
router.post('/posts/:id/unlike', ensureAuthenticated, async(req, res)=>{
    post=await Post.findOne({_id:req.params.id});
    if(req.body.counter==-1){
        if (req.user.likedPosts.includes(req.params.id)) {
            await post.likes--;
            await User.findByIdAndUpdate(req.user._id, {$pull: {likedPosts: req.params.id}})
            await post.save();
            return res.send(post.likes.toString());
            
        }
    }
       
});
//rendering the post uploading page
router.get('/posts', ensureAuthenticated, (req, res) => {
    res.render('post');
})
//deleting a post and its related images
router.get('/posts/:id/delete', ensureAuthenticated, async(req, res)=>{
    post = await Post.find({ _id: req.params.id });
    fs.unlinkSync('public/'+ post[0].postimage);
    await Comment.deleteMany({id: req.params.id});
    await Post.findByIdAndDelete({_id: req.params.id});
    res.redirect('/');
    
})
//displaying a blog post
const converter= new showdown.Converter();
router.get('/posts/:id', ensureAuthenticated, async(req, res)=>{
    let isliked;
    if(req.user.likedPosts.includes(req.params.id)){
        isliked=true;
    }
    else{
        isliked=false;
    }
    const post= await Post.find({_id:req.params.id}).populate('comments');
    post.body=converter.makeHtml(post[0].body);
    if(post){
        res.render('blogs',{
            post:post[0],
            isliked
            
        });
    }
    else{
     console.log("postssss")   
    }
})
//commenting on the post
router.post('/posts/:id/comment', ensureAuthenticated, async(req, res)=>{
   post=await Post.findOne({_id:req.params.id});
    const text= req.body.comment;
    console.log(text);
        try{
          comment=new Comment({
              text,
              username:req.user.username,
              id:req.params.id
          })
          await comment.save()
            await Post.findByIdAndUpdate(req.params.id, { $push: { comments: comment._id } },
                { new: true, useFindAndModify: false });
            await User.findByIdAndUpdate(post.user._id, {
                    $push: {
                        notifications: {
                            message: `${req.user.username} commented on your post: ${text}`,
                            link: `/blog/posts/${req.params.id}`
                        }
                    }
                })
            await post.save();
            return res.send(true);
        }
     catch(ex){
         console.log('something went wrong',ex);
     }
    
})
//rendering the updatepost page
router.get('/updatepost/:id', ensureAuthenticated, async(req, res)=>{
    const post=await Post.findOne({_id: req.params.id})
    res.render('updatepost',{
        post
    });
})
//updating the post 
router.post('/updatepost/:id', ensureAuthenticated, async(req, res)=>{
    const errors=validationResult(req);
    if(errors.isEmpty()){
        const {title, description, body}=req.body;
        var post= await Post.findOne({_id:req.params.id});
        post.title=title;
        post.description=description;
        post.body=body;
        await post.save();
        await User.updateMany({followingusers:req.user._id }, {
            $push: {
                notifications: {
                    message: `${req.user.username} updated the post : "${post.title}"`,
                    link: `/blog/posts/${req.params.id}`
                }
            }
        })
        res.redirect('/blog/posts/'+ req.params.id);

    }
    else{
        res.render('updatepost',{
            errors:errors
        })
    }
  
})
//storage for post images
const storageA = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // reject a file
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const uploadA = multer({
  storage: storageA,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter
});

//storage for profile images

const storageB = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/profile_pic/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadB = multer({
    storage: storageB,
    limits: {
      fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
  });
//uploading profile image
router.post('/profile/edit', ensureAuthenticated, uploadB.single('profileimage'), async(req, res)=>{
 if(!req.file){
     res.redirect('/blog/me');
 }
 else{
    const { filename: profileimage } = req.file;
       
    await sharp(req.file.path)
     .resize(150, 150)
     .jpeg({ quality: 90 })
     .toFile(
         path.resolve(req.file.destination,'resized',profileimage)
     )
     fs.unlinkSync(req.file.path);
     console.log(req.file.path);
    await User.findByIdAndUpdate(req.user._id, { $set: { profileimage: `/profile_pic/resized/${req.file.filename}`} })
    res.redirect('/blog/me');
 }
     
})
// rendering profile page
router.post('/profile', ensureAuthenticated, async(req,res)=>{
    user= await User.findOne({_id:req.user._id});
    if(!req.body.bio){
        res.redirect('/blog/me')
    }
    else{
        user.bio=req.body.bio;
        console.log(user.bio);
        await user.save();
        res.redirect('/blog/me');
    }
})

// creating a new post and informing the followers of the creator about the new post
router.post('/posts', ensureAuthenticated, uploadA.single('postimage'), async (req, res) => {
    
    const { title, description, body } = req.body;
    console.log(req.body);
    if (!title || !description || !body ) {
        res.render('post', {
            errors: 'please fill all fields'
        });
    }
    else {
        try {
            newpost = new Post({
                title,
                body,
                user: {
                    _id: req.user._id,
                    username: req.user.username,
                    profileimage:req.user.profileimage
                },
                description,
                postimage: `/uploads/${req.file.filename}`
            })
            await newpost.save();
            await User.updateMany({followingusers: req.user._id} ,{
                $push: {
                    notifications: {
                        message: `${req.user.username} posted a new post`,
                        link: `/blog/post/${newpost._id}`
                    }
                } 
            });
            res.redirect('/');
            console.log(newpost);
        }
        catch (ex) {
            console.log('smthg went wrong', ex)
        }

    }
    

})
// rendering the update page 
router.get('/updateprofile', ensureAuthenticated, (req, res)=>{
    res.render('update');
})
// updating the username of the user
router.post('/updateprofile', 
body('newname').isLength({ min: 3 }).withMessage('please provide a valid username'),

ensureAuthenticated, async(req, res)=>{
    const errors=validationResult(req);
    if( errors.isEmpty()){
        const {newname}= req.body;
        console.log(newname)
        user= await User.findById(req.user._id);
        if(!user){
            res.render('update',{
                errors:'sry smthg is wrong'
            })
        }
        else{
            await Comment.updateMany({username:user.username},{ $set: { username : newname}} ,function (err, docs) {
                if (err){
                    console.log(err)
                }
                else{
                    console.log("Updated Docs : ", docs);
                }
            })
            user.username= newname;
            await user.save();
            res.redirect('/blog/me');
        }
       
    }
    else{
        res.render('update',{
            errors:'please fill all the field'
        })

    }

})

module.exports = router;
    

