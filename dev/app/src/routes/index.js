exports.index = function(req, res){
  res.render('index', { title: 'Home', noNav: true, controller: "home-controller", username: req.user._id, app: {name: "IdeaFunnelMainApp", fileName: "ideafunnel-main-app"}});
};

exports.error404 = function(req, res) {
    res.render('error', {title: "Not found", error: "Page not found"});
};

exports.placeholder = function(req, res){
    res.render('placeholder', { title: 'Idea Funnel' });
};

exports.feed = function(req, res){
    res.render('feed/all-links', { title: 'All Links' });
};

exports.login = function(req, res) {
    var renderObj = {
        title: "Login to Idea Funnel",
        noNav: true
    },
        error = req.flash("error");

    if (error) {
        renderObj.error = error;
    }

    res.render('login', renderObj);
};

exports.landing = function(req, res) {
    res.render('landing', {title: 'Idea Funnel - Release Your Ideas', controller: "landing-controller"});
};

exports.logout = function(req, res) {
    req.logout();
    res.redirect('/');
};