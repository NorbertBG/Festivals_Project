const express = require('express');
const router = express.Router();
const appGenres = require("../utils/genres");

const path = require("path");
// ********* require fileUploader in order to use it *********
const fileUploader = require('../config/cloudinary.config');

const countryList = require("../middleware/getCountryList");

const isLoggedIn = require("../middleware/isLoggedIn");
// Require the Festival model in order to interact with the database
const mongoose = require("mongoose");
const Festival = require("../models/Festival.model");
const User = require("../models/User.model")
const Comment = require("../models/Comment.model")


/* GET home page where you can login or register */
router.get("/", (req, res, next) => {
  res.render("auth/index");
});

/* GET profile page */
router.get("/profile", isLoggedIn, (req, res, next) => {
  User.findOne()
    .then((data) => {
      // console.log(data)
      res.render("profile", { data });
    })
})

/* POST profile page */
router.post("/profile",isLoggedIn, fileUploader.single('profileImage'), (req, res, next) => {
  const { id, email, password, firstName, lastName, bio } = req.body;
  console.log(req.file)
  console.log(req.body)
  User.findByIdAndUpdate(id, {
    email: email,
    password: password,
    firstName: firstName,
    lastName: lastName,
    bio: bio,
    // profileImage: req.file.path
  }, { returnOriginal: false }).then((data) => {
    /**
     * Optional: We set a new variable "message" under request.session
     * which will be used later as a notification message
     */
    req.session.message = {
      type: 'success',
      body: 'Your changes has been saved'
    };
    res.redirect(`/profile`);

  })
})


/* GET All festivals page "homepage after login" */
router.get("/festivals", isLoggedIn, (req, res, next) => {
  Festival.find()
    .then((datafromDB) => {

      res.render("festivals", { datafromDB });
    })
});



/* GET add a new festival */
router.get("/festivals/new", countryList, isLoggedIn, (req, res, next) => {
  const countries = [];
  // console.log(req.countries)
  console.log(req.session.currentUser)
  req.countries.forEach(item => {
    countries.push(item);
  });
  res.render("new-festival", { appGenres, countries: countries });
});

/* POST add a new festival */
router.post("/festivals/new",isLoggedIn, fileUploader.single('eventImage'), (req, res, next) => {
  const { name, country, city, description, genre, season } = req.body;
  console.log('this is:', req.file.path)

  Festival.create({ name, country, city, description, genre, season, imageUrl: req.file.path, author:req.session.currentUser })
    .then((datafromDB) => {
      console.log(datafromDB)
      res.redirect('/festivals');
    });
});



/* GET details of one festival */
router.get("/festivals/:festivalID", isLoggedIn,(req, res, next) => {
  const { festivalID } = req.params;
  /**
   * Optional: We read the "message" variable exists and
   * is stored stored under session
   */
  const message = req.session.message;
  delete req.session.message;

  Festival.findById(festivalID)
    .populate("author comments") // <-- the same as .populate('author).populate('comments')
    .populate({
      // we are populating author in the previously populated comments
      path: "comments",
      populate: {
        path: "author",
        model: "User"
      }
    })
    .then((data) => {
      console.log(data)
      res.render("details-festival", { data, message, festivalID }
      )
    })
    .catch((error) => {
      console.log(`Err while getting a single post from the  DB: ${error}`);
      next(error);
    });

});



/* GET edit/delete festival */
router.get("/festivals/:festivalID/edit", isLoggedIn, countryList, (req, res, next) => {
  const { festivalID } = req.params;
  Festival.findById(festivalID)
    .then((data) => {
      const genresObject = []
      appGenres.forEach(item => {
        if (data.genre == item) {
          genresObject.push({ label: item, isSelected: true });
        } else {
          genresObject.push({ label: item, isSelected: false });
        }
      })
      return { data, genresObject };
    })
    .then((response) => {
      //console.log(response.data.name)
      const countriesArray = []
      req.countries.forEach(item => {
        if (response.data.genre == item) {
          countriesArray.push({ label: item, isSelected: true });
        } else {
          countriesArray.push({ label: item, isSelected: false });
        }
      })
      res.render("edit-festival", { data: response.data, genresObject: response.genresObject, countriesArray: countriesArray });
    })
});


/* POST edit/delete festival */

router.post('/festivals/:festivalID/edit',isLoggedIn, fileUploader.single('eventImage'), (req, res) => {

  console.log(req.body)
  const { id, name, country, description, genre, season, city, existingImage } = req.body;
  

  let imageUrl;
  if (req.file) {
    imageUrl = req.file.path;
  } else {
    imageUrl = existingImage;
  }

  Festival.findByIdAndUpdate(id, {name, country, description, genre, imageUrl, season, city
  }, { new: true })
  .then(() => res.redirect(`/festivals`))
  .catch(error => console.log(`Error while updating a single festival: ${error}`));
});



  router.post('/festivals/:festivalID/delete', isLoggedIn,(req, res) => {
    const { festivalID } = req.params

    Festival.findByIdAndDelete(festivalID)
      .then(() => res.redirect("/festivals"))
      .catch(error => next(error));
  });

  // POST comments in festivals details page
  router.post("/festivals/:festivalId/comment", isLoggedIn, (req, res, next) => {
    const { festivalId } = req.params;
    const { author, content } = req.body;

    let user;

    User.findOne({ email: author })
      .then((userDocFromDB) => {
        user = userDocFromDB;

        // 1. if commenter is not user yet, let's register him/her as a user
        if (!userDocFromDB) {
          return User.create({ email: author });
        }
      })
      .then((newUser) => {
        // prettier-ignore
        Festival.findById(festivalId)
          .then(dbFestival => {
            let newComment;

            // 2. the conditional is result of having the possibility that we have already existing or new users
            if (newUser) {
              newComment = new Comment({ author: newUser._id, content });
            } else {
              newComment = new Comment({ author: user._id, content });
            }

            // 3. when new comment is created, we save it ...
            newComment
              .save()
              .then(dbComment => {

                // ... and push its ID in the array of comments that belong to this specific post
                dbFestival.comments.push(dbComment._id);

                // 4. after adding the ID in the array of comments, we have to save changes in the post
                dbFestival
                  .save()       // 5. if everything is ok, we redirect to the same page to see the comment
                  .then(updatedFestival => res.redirect(`/festivals/${updatedFestival._id}`))
              });
          });
      })
      .catch((err) => {
        console.log(`Error while creating the comment: ${err}`);
        next(err);
      });
  });

  

  router.post("/festivals/:festivalID/comments/:commentID/delete", isLoggedIn, (req, res, next) => {
    const { festivalID, commentID } = req.params;

    Comment.findByIdAndRemove(commentID)
      .then(() => {
        // Comment deleted successfully
        res.redirect(`/festivals/${festivalID}`);
      })
      .catch((error) => {
        console.log(`Error deleting comment: ${error}`);
        next(error);
      });
  });


  module.exports = router;
