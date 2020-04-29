const jwt = require('jsonwebtoken');
const Models = require('../models/Models');
const {Customer} = Models;

const authCustomer = async function(req,res,next){

    try{
        const token = req.header('Authorization').replace('Bearer ','');
        const decode = await jwt.verify(token,process.env.secret);

        const customer = await Customer.findOne({_id:decode._id,'tokens.token':token, Verified:true});
        if (!customer){
            throw new Error();
        }
        
        req.token = token;
        req.customer = customer;
        next();
    }catch(e){
       res.status(401).send({error: 'please authenticate'});
    }

}

const authRider = async function(req,res,next){
    next()
}

module.exports = { authCustomer,authRider};