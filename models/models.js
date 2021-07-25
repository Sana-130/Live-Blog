const mongoose = require('mongoose');
const Joi = require('joi');

// const passwordComplexity = require("joi-password-complexity");

const notificationSchema= new mongoose.Schema({
    message:{
        type:String,
        required:true
    },
    link:{
        type:String,
    },
    date:{
        type:Date,
        default: Date.now
    }
})
const Userschema = new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    followingusers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:'User'
        }
    ],
    profileimage: {
        type: String,
        default:'/images/profile_image.jpg'
    },
    bio:{
        type: String,
    },
    follower:[

        {
            type: mongoose.Schema.Types.ObjectId,
            ref:'User'
        }
    ],
    likedPosts:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Post'
        }
    ],
    notifications: [
        notificationSchema
    ]
    
   
})
//comments
const Commentschema= new mongoose.Schema({
    text:{
        type: String,
        trim:true,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    username:{
        type:String,
        required:true
    },
    id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Post'
    }

})
//posts
const Postschema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true
    },
    user: {
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        username: {
            type: String,
            required:true
        },
        profileimage:{
            type:String
        }
    
    },
    description:{
        type: String,
        required:true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    postimage: {
        type:String
    },
    comments:[
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    }],
    likes:{
        type:Number,
        default:0
    }

})


Userschema.pre('save', function (next) {
    var user = this;
    user.needstoupdate = user.isModified('username');
    next();
})

Userschema.post('save', function (doc, next) {
    var user = this;
    if (this.needstoupdate) {
        Post.update({ 'user._id': user._id },
            { $set: { 'user.username': user.username } },
            { multi: true },
            function (err) {
                if (err) { return next(err) }
                next();
            })
    } else {
        next();
    }
});


const User = mongoose.model('User', Userschema);
const Comment=mongoose.model('Comment', Commentschema);
const Post = mongoose.model('Post', Postschema);


exports.Comment=Comment;
exports.User = User;
exports.Post=Post;
