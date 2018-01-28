const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mailer = require('../../modules/mailer');

const authConfig = require('../../config/auth');

function generateToken(params = {}) {
    return jwt.sign(params, authConfig.secret, {
        expiresIn: 86400,
    });
}

const router = express.Router();
router.post('/register', async(req, res) => {
    const {email} = req.body;
    try {
        if (await User.findOne({ email }))
            return res.status(400).send({ error: 'User is already registered' });

        const user = await User.create(req.body);    
        user.password = undefined;

        return res.send({ 
            user,
            token: generateToken({ id: user.id }),
        });
    }    
    catch(err) {
        return res.status(400).send({ error: 'Registration failed' });
    }    
});    

router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    
    if (!user)
    return res.status(400).send({ error: 'User not found' });
    
    if (!await bcrypt.compare(password, user.password))
        return res.status(400).send({ error: 'Wrong password' });
    
    user.password = undefined;    


    return res.send({ 
        user, 
        token: generateToken({ id: user.id }),
    });
});

router.post('/forgot_password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user)
            return res.status(400).send({ error: 'User not found' });
    
        const token = crypto.randomBytes(20).toString('hex');
        
        const now = new Date();
        now.setHours(now.getHours() + 1);

        await User.findByIdAndUpdate(user.id, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: now,
            }
        });

        mailer.sendMail({
            to: email,
            from: 'emburaman@gmail.com',
            template: 'auth/forgot_password',
            context: { token },
        }, (err) => {
            if(err)
                return res.status(400).send({ error: 'Unable to send reset email' });

            return res.send();
        });

    } catch (err) {
        res.status(400).send({ error: 'Error' });
    }
});

router.post('/reset_password', async (req, res) => {
    const { email, token, password } = req.body;

    try {
        const user = await User.findOne({ email })
            .select('+passwordResetToken passwordResetExpires');

        if (!user)
            return res.status(400).send({ error: 'User not found' });
            
        if (token !== user.passwordResetToken)
            return res.status(400).send({ error: 'Invalid token' });
            
        const now = new Date();
        if (now > user.passwordResetExpires)
            return res.status(400).send({ error: 'Token expired' });
            
        user.password = password;
        await user.save();

        res.send();
        
    } catch (err) {
        res.status(400).send({ error: 'Reset password failed' });
    }
});

module.exports = app => app.use('/auth', router);