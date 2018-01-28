const express = require('express');
const authMiddlewere = require('../middlewere/auth');

const router = express.Router();

router.use(authMiddlewere);

router.get('/', (req, res) => {
    res.send({ ok: true, user: req.userId });
});

module.exports = app => app.use('/projects', router);