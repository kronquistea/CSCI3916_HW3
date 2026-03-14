const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt'); // You're not using authController, consider removing it
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies'); // You're not using Movie, consider removing it

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

// Removed getJSONObjectForMovieRequirement as it's not used

router.post('/signup', async (req, res) => { // Use async/await
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ success: false, msg: 'Please include both username and password to signup.' }); // 400 Bad Request
  }

  try {
    const user = new User({ // Create user directly with the data
      name: req.body.name,
      username: req.body.username,
      password: req.body.password
    });

    await user.save(); // Use await with user.save()

    res.status(201).json({ success: true, msg: 'Successfully created new user.' }); // 201 Created
  } catch (err) {
    if (err.code === 11000) { // Strict equality check (===)
      return res.status(409).json({ success: false, message: 'A user with that username already exists.' }); // 409 Conflict
    } else {
      console.error(err); // Log the error for debugging
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
    }
  }
});


router.post('/signin', async (req, res) => { // Use async/await
  try {
    const user = await User.findOne({ username: req.body.username }).select('name username password');

    if (!user) {
      return res.status(401).json({ success: false, msg: 'Authentication failed. User not found.' }); // 401 Unauthorized
    }

    const isMatch = await user.comparePassword(req.body.password); // Use await

    if (isMatch) {
      const userToken = { id: user._id, username: user.username }; // Use user._id (standard Mongoose)
      const token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: '1h' }); // Add expiry to the token (e.g., 1 hour)
      res.json({ success: true, token: 'JWT ' + token });
    } else {
      res.status(401).json({ success: false, msg: 'Authentication failed. Incorrect password.' }); // 401 Unauthorized
    }
  } catch (err) {
    console.error(err); // Log the error
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
  }
});

router.route('/movies')
    .get(authJwtController.isAuthenticated, async (req, res) => {
      try {
        const movies = await Movie.find({}); // Fetch all movies from the database
        return res.json(movies); // Return the movies as JSON
      } catch (err) {
        console.error(err); // Log the error
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
      }
    })
    .post(authJwtController.isAuthenticated, async (req, res) => {
      try {
        if(!req.body.actors || req.body.actors.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one actor is required.' }); // 400 Bad Request
        }
        else {
          const movie = new Movie(req.body); // Create a new movie with the request body
          await movie.save();
          res.status(201).json({ success: true, msg: 'Movie created successfully.', movie });
        }
      } catch (err) {
        console.error(err); // Log the error
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
      }
    });

router.route('/movies/:title')
    .get(authJwtController.isAuthenticated, async (req, res) => {
      try{
        const movie = await Movie.findOne({ title: req.params.title }); // Find movie by title
        if (!movie) {
          return res.status(404).json({ success: false, message: 'Movie not found.' }); // 404 Not Found
        }
        res.json({success: true, msg: "Movie Found", movie});
      } catch (err) {
        console.error(err); // Log the error
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
      }
    })
    .put(authJwtController.isAuthenticated, async (req, res) => {
      try{
        const movie = await Movie.findOneAndUpdate(
          { title: req.params.title }, 
          req.body, 
          { new: true, runValidators: true } // Return the updated document and run validators
        );
        if (!movie) {
          return res.status(404).json({ success: false, message: 'Movie not found.' }); // 404 Not Found
        }
        res.json({ success: true, msg: 'Movie updated successfully.', movie }); // Return success message
      } catch (err) {
        console.error(err); // Log the error
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
      }
    })
    // .delete(authJwtController.isAuthenticated, async (req, res) => {
    //   try{

    //   } catch (err) {
    //     console.error(err); // Log the error
    //     res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
    //   }
    // });

// router.route('/movies/:title')
//     .get(authJwtController.isAuthenticated, async (req, res) => {
//       try {
//         const movie = await Movie.findOne({ title: req.params.title }); // Find movie by title
//         res.json(movie); // Return the movie as JSON
//       } catch (err) {
//         console.error(err); // Log the error
//         res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
//       }
//     })
//     .put(authJwtController.isAuthenticated, async (req, res) => {
//       try {
//         const movie = await Movie.findOneAndUpdate(
//           { title: req.params.title }, 
//           req.body, 
//           { 
//             new: true, 
//             runValidators: true 
//           }
//         ); // Update movie and return the updated document

//         if (!movie) {
//           return res.status(404).json({ success: false, message: 'Movie not found.' }); // 404 Not Found
//         }

//         res.json({ success: true, msg: 'Movie updated successfully.', movie }); // Return success message
//       } catch (err) {
//         console.error(err); // Log the error
//         res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
//       }
//     })
//     .delete(authJwtController.isAuthenticated, async (req, res) => {
//       try {
//         const movie = await Movie.findOneAndDelete({ title: req.params.title }); // Delete movie by title
//         if (!movie) {
//           return res.status(404).json({ success: false, message: 'Movie not found.' }); // 404 Not Found
//         }
//         res.json({ success: true, msg: 'Movie deleted successfully.', movie }); // Return success message
//       } catch (err) {
//         console.error(err); // Log the error
//         res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
//       }
//     });

app.use('/', router);

const PORT = process.env.PORT || 8080; // Define PORT before using it
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // for testing only