const router = require('express').Router();
const Account = require('../models/Account');
const User = require('../models/User');
const ensureAuth = require('../auth/ensure-auth')();
const { sign } = require('../auth/token-service');

function hasEmailAndPassword(req, res, next) {
  const user = req.body;
  if(!user || !user.email || !user.password) {
    return next({
      code: 400,
      error: 'Name, email, and password must be provided'
    });
  }
  next();
}

router
  .get('/verify', ensureAuth, (req, res) => {
    res.json({ verified: true });
  })

  .post('/signup', hasEmailAndPassword, (req, res, next) => {
    const { email, password, firstName, lastName } = req.body;
    delete req.body.password;

    Account.find({ email })
      .count()
      .then(count => {
        if (count) throw { code: 400, error: 'Email already in use.' };
        const account = new Account({ email, firstName });
        account.generateHash(password);
        return account.save();
      })
      .then(account => {
        const user = new User({ email, firstName, lastName, _id: account._id });
        return [account, user.save()];
      })
      .then(([account]) => {
        res.json({ token: sign(account), name: firstName });
        // this work needs to be accounted for prior to responding!
        // new User({ email, firstName, lastName, _id: account._id }).save();
      })
      .catch(next);
  })

  .post('/signin', (req, res, next) => {
    const { email, password } = req.body;
    delete req.body.password;

    Account.findOne({ email })
      .then(account => {
        if(!account || !account.comparePassword(password)) throw {
          code: 401,
          error: 'Invalid email or password.'
        };
        const name = account.firstName;
        const token = sign(account);
        res.json({ token, name });
      })
      .catch(next);
  });

module.exports = router;