import express from "express";

import models from "../models/index.js";
import { hashPassword, validatePassword } from "./passwordManagement.js";

const { User, Session } = models;

const router = express.Router();

router.get("/login", (req, res) => {
  const { email, password } = req.body;
  //find the user by email
  User.find({ email }, (err, docs) => {
    //fail if there's an error
    if (err) return res.status(501).send("Login / User query error.");

    //fail if the email doesn't apply to any accounts
    if (docs.length === 0)
      return res.status(401).send("Login / Invalid credentials.");

    const { salt, hash, iterations, id: userID, email } = docs[0];

    //confirm that they've entered the correct credentials.
    validatePassword(hash, salt, iterations, password)
      .then((isValid) => {
        //return new session ID if successful
        if (isValid) {
          Session.deleteMany({ user: userID }, (err) => {
            if (err) {
              console.error(err);
              res
                .status(501)
                .send("Logout / Failed to clear existing sessions");
            } else {
              const session = new Session({
                user: userID,
                expiration: Date.now() + 36000000, //+12hrs
              });
              session
                .save()
                .catch((err) => res.status(501).send("Saving session failed."));

              res.cookie("session", session._id, { maxAge: 36000000 });
              res.cookie("user", userID, { maxAge: 36000000 });
              res.status(200).send("Authenticated.");
            }
          }).catch((err) => res.status(501).send("Session query failed."));
        }

        //fail if validation doesn't succeed
        else res.status(401).send("Login / Invalid credentials.");
      })
      .catch((err) => {
        //handle validation error
        res.status(501).send("Login / Validation Error");
      });
  });
});

router.get("/logout", (req, res) => {
  const { session } = req.cookies;
  Session.findByIdAndDelete(session, (err, result) => {
    if (err) {
      res.status(501).send("Failed to close session");
    } else {
      res.status(200).send("Logged out.");
    }
  }).catch((err) => res.status(501).send("Session query failed."));
});

router.post("/signup", (req, res) => {
  const { email, password } = req.body;

  //check if user email is in use
  User.find({ email }, (err, docs) => {
    //check if it failed
    if (err)
      return res
        .status(501)
        .send("Unknown error occurred when checking if email already in use.");

    //fail if the email is in use
    if (docs.length > 0) return res.status(400).send("Email already in use.");

    //create the user if not exists
    hashPassword(password)
      .then(({ salt, hash, iterations }) => {
        //create the new user entry
        const newUser = new User({ email, salt, hash, iterations });
        newUser
          .save()
          .catch((err) => res.status(501).send("Saving new user failed."));
        return res.json(newUser);
      })
      //handle hashing error
      .catch((err) => res.status(501).send(err));
  }).catch((err) => res.status(501).send("User query failed."));
});

export default router;
