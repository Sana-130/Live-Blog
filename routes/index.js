const express=require('express');
const {User, Post}= require('../models/models');
const router= express.Router();

const {ensureAuthenticated}= require('../config/auth.js');


router.get('/', ensureAuthenticated, async (req, res)=>{ 
    const posts= await Post.find({}).sort({createdAt:-1})
    res.render('home', {
        user:req.user,
        posts
    })
    
})
router.get('/search', ensureAuthenticated, async function(req, res){
    var regx = "^" + req.query.ID + ".*";
    await User.find({username:{ $regex :regx }}).exec((err, all)=>{
            console.log(all);
            if(all){
                return res.send(all)
            }
            else{
                return res.send('oops no users found');
            }
        
    })
    
});
router.get('/feed', ensureAuthenticated, async(req, res)=>{
    const posts=await Post.find({}).
    where('user._id').in(req.user.followingusers)
    .sort({createdAt:-1});
    res.render('feed',{
        posts
    })

})

router.get('/notifications', ensureAuthenticated, async(req, res)=>{
    notifications= await req.user.notifications;
    res.render('notification',{
        notifications
    })
})
router.post('/notifications/clear', ensureAuthenticated, async(req, res)=>{
  user= await User.findOne({_id:req.user._id});
  await user.notifications[0].remove();
  await user.save();
  return res.send(true);
})
router.get('/likedposts', ensureAuthenticated, async(req, res)=>{
  posts=await req.user.likedPosts;
    res.render('likedPosts',{
        posts
    })
})
module.exports=router;

