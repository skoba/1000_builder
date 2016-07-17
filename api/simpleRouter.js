'use strict';

const express = require('express');
const config = require('config');
const jwt = require('jwt-simple');
const logger = require('../log/logger');
const simpleBuilder = require('../api/simpleBuilder');

var router = express.Router();

function sendError (err, req, res) {
	var message = {
		error: err
    };
	var status = (err.message === 'invalid_client' || err.message ==='invalid_grant') ? 401 : 400;
	res.status(status);
	res.header('Content-Type', 'application/json;charset=UTF-8');
	res.header('Cache-Control', 'no-store');
	res.header('Pragma', 'no-cache');
	res.end(JSON.stringify(message));
};

function authenticate (req, res, next) {
    var auth = req.get('Authorization');
    logger.debug(auth);
    if (auth === 'Undefined' || !auth.startsWith('Bearer ')) {
		return sendError('invalid_request', req, res);
    }
    var index = auth.indexOf(' ');
    var token = auth.substring(index+1);
    try {
        var decoded = jwt.decode(token, config.jwt.secret);
        logger.debug(decoded);
        next();
    } catch (err) {
		sendError('invalid_grant', req, res);
    }
}

router.post(config.path.simple, authenticate, (req, res) => {
    var parsed = req.body;
    logger.debug(parsed);
    var mml = simpleBuilder.build(parsed);
    logger.debug(mml);
    res.status(200).json({
        result: 'success',
        mml: mml
    });
});

module.exports = router;
