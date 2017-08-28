let express = require('express');
let router = express.Router();

let algoliasearch = require('algoliasearch');

let async = require("async");

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

    let errors = [];
    let message = null;

    let source_app_id = req.body.source_app_id;
    let source_app_key = req.body.source_app_key;
    let target_app_id = req.body.target_app_id;
    let target_app_key = req.body.target_app_key;
    let copy_settings = false; if (req.body.copy_settings) copy_settings = true;
    let copy_datas = false;
    let copy_override = false; if (req.body.copy_override) copy_override = true;
    let limit = 0

    if (req.body.copy_datas){
        copy_datas = true;
        if (req.body.limit)
            limit = req.body.limit;
    }


    let sourceClient = null;
    if (source_app_id && source_app_key)
        sourceClient = algoliasearch(source_app_id, source_app_key); // origine
    else errors.push('Please provide a source app id and a source admin api key.');

    let targetClient = null;
    if (target_app_id && target_app_key)
        targetClient = algoliasearch(target_app_id, target_app_key); // destination
    else errors.push('Please provide a target app id and a target admin api key.');

    if (sourceClient && targetClient) {

        async.series([
            function(callback) {
                if (copy_override) {
                    targetClient.listIndexes((err, content) => {
                        if (err) {
                            console.log('override error', err);
                        } else {
                            for (let i = 0; i < content.items.length; i++) {
                                let indexName = content.items[i].name;

                                targetClient.deleteIndex(indexName, function(err) {
                                    if (err) {
                                        errors.push(err);
                                    }
                                });
                            }
                        }
                        callback(null);
                    });
                } else {
                    callback(null);
                }
            },
            function(callback) {

                // first get source list index
                sourceClient.listIndexes((err, content) => {
                    for (let i = 0; i < content.items.length; i++) {
                        let indexName = content.items[i].name;

                        // mount index
                        let sourceIndex = sourceClient.initIndex(indexName);
                        let targetIndex = targetClient.initIndex(indexName);

                        if (copy_settings) {
                            // copy index settings
                            sourceIndex.getSettings((err, content) => {
                                // set index 2 settings, it will create it !
                                targetIndex.setSettings(content, (err, content) => {
                                    if (!err) {
                                        console.log(indexName + ' created in new algolia and setted up.');

                                        if (copy_datas && limit >= 0) {
                                            // browse all origin index datas
                                            let browser = sourceIndex.browseAll();
                                            let hits = [];

                                            browser.on('result', function onResult(content) {
                                              hits = hits.concat(content.hits);
                                            });

                                            browser.on('end', function onEnd() {
                                              console.log('Finished!');
                                              console.log('We got %d hits', hits.length);

                                              // add objects to destination index
                                              targetIndex.addObjects(hits.slice(0, parseInt(limit)), (err, content) => {
                                                  if (err) errors.push(err);
                                                  else console.log('objects added into new index');
                                              });
                                            });

                                            browser.on('error', function onError(err) {
                                              throw err;
                                            });
                                        }

                                    }
                                });


                            });
                        } else {
                            if (copy_datas && limit >= 0) {
                                // browse all origin index datas
                                let browser = sourceIndex.browseAll();
                                let hits = [];

                                browser.on('result', function onResult(content) {
                                  hits = hits.concat(content.hits);
                                });

                                browser.on('end', function onEnd() {
                                  console.log('Finished!');
                                  console.log('We got %d hits', hits.length);

                                  // add objects to destination index
                                  targetIndex.addObjects(hits.slice(0, parseInt(limit)), (err, content) => {
                                      if (err) errors.push(err);
                                      else console.log('objects added into new index');
                                  });
                                });

                                browser.on('error', function onError(err) {
                                  throw err;
                                });
                            }
                        }
                    }
                });
                callback(null);
            }
        ], function(err) {
            // success
            if (err) {
                console.log('async error', err);
            } else {
                console.log('async success');
            }
            message = 'The source environment is copied into the target one.'
            res.render('copy', {errors: errors, message: message});
        });
    } else {
        errors.push('Sorry, one of the environment doesn\'t exist.');
    }
});

/* GET clear */
router.get('/clear', function(req, res, next) {
    res.render('clear');
});

router.post('/clear', function(req, res, next) {
    let errors = [];
    let message = null;
    let target_app_id = req.body.target_app_id;
    let target_app_key = req.body.target_app_key;

    let client = null;
    if (target_app_id && target_app_key)
        client = algoliasearch(target_app_id, target_app_key); // destination
    else errors.push('Please provide a target app id and a target admin api key.');
    async.series([
        function(callback) {
            if (client) {
                client.listIndexes(function(err, content) {
                    for (let i = 0; i < content.items.length; i++) {
                        let indexName = content.items[i].name;

                        client.deleteIndex(indexName, (err) => {
                            if (!err) {
                                console.log('index deleted');
                            } else {
                                errors.push(err);
                            }
                        });
                    }
                    message = 'The environment is cleared.'
                    callback(null);
                });
            } else {
                errors.push('Sorry, this environment doesn\'t exist.');
                callback(null);
            }
        }
    ], function(err) {
        res.render('clear', {errors: errors, message: message});
    });
});

module.exports = router;
