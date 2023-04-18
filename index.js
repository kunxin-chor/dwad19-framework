require("dotenv").config();
const express = require("express");
const hbs = require("hbs"); // https://www.npmjs.com/package/hbs
const wax = require("wax-on"); // https://www.npmjs.com/package/wax-on
const session = require("express-session");
const flash = require("connect-flash");
const csurf = require("csurf");
const FileStore = require("session-file-store")(session);
const { useRenderForm } = require("./middlewares");
const { FlashMessages } = require("./constants");

// import in the routes
const landingRoutes = require("./routes/landing");
const productsRoutes = require("./routes/products");
const usersRoutes = require("./routes/users");
const cloudinaryRoutes = require("./routes/cloudinary.js");
const shoppingCartRoutes = require("./routes/shoppingCart.js");
const checkoutRoutes = require("./routes/checkout");

// create an instance of express app
const app = express();

// set the view engine
app.set("view engine", "hbs"); // Add support for handlebars templating engine {{ ... }}

// add support for session management
app.use(
  session({
    store: new FileStore(),
    secret: process.env["SESSION_SECRET"],
    resave: false,
    saveUninitialized: true,
  })
);

// enable forms
app.use(
  express.urlencoded({
    extended: false,
  })
);

// enable csrf
app.use(csurf());

// Note that the urlencoded middleware needs to come first before
// the csurf middleware so that the urlencoded can parse the form data
// before the csurf middleware can consume it.

// add support for flash
// flash is a special area of the session used for storing messages
app.use(flash());
app.use(function (req, res, next) {
  // The res.locals is an object that contains the local variables for the response
  // which are scoped to the request only and therefore just available for the views
  // rendered during that request or response cycle
  res.locals.successMessages = req.flash(FlashMessages.SuccessMessages);
  res.locals.errorMessages = req.flash(FlashMessages.ErrorMessages);

  // This is so that the rendered page has access to the logged in user details
  res.locals.user = req.session.user;

  // share the csrf token to frontend
  res.locals.csrfToken = req.csrfToken();

  // share the cloudinary configs
  res.locals.cloudinaryName = process.env.CLOUDINARY_NAME;
  res.locals.cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
  res.locals.cloudinaryPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  // call next to hand over to the next middleware/handler in the pipeline
  next();
});

app.use(useRenderForm);

// static folder
app.use(express.static(".")); // Seems like express@4.18.2 already appends 'public' to the path

// setup wax-on
wax.on(hbs.handlebars); // register wax-on helpers with handlerbars
wax.setLayoutPath("./views/layout");

// register routes
app.use("/", landingRoutes);
app.use("/products", productsRoutes);
app.use("/users", usersRoutes);
app.use("/cloudinary", cloudinaryRoutes);
app.use("/cart", shoppingCartRoutes);
app.use("/checkout", checkoutRoutes);

// register a csrf partial so we can reuse the same template to add csrf token into a form
hbs.handlebars.registerPartial(
  "csrf",
  '<input type="hidden" name="_csrf" value="{{csrfToken}}"/>'
);

async function main() {}
main();

app.listen(3000, () => {
  console.log("Server has started");
});
