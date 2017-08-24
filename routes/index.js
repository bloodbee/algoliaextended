let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

/* GET copy */
router.get('/copy', function(req, res, next) {
    res.render('copy');
});

/* POST copy */
router.post('/copy', function(req, res, next) {

    let errors = null;
    
    let source_app_id = req.body.source_app_id;
    let source_app_key = req.body.source_app_key;
    let target_app_id = req.body.target_app_id;
    let target_app_key = req.body.target_app_key;


    res.render('copy');
});

/* GET clear */
router.get('/clear', function(req, res, next) {
    res.render('clear');
});

module.exports = router;
