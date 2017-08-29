let express = require('express');
let router = express.Router();

let algoliasearch = require('algoliasearch');

let async = require("async");

let fs = require('fs');

let jsonfile = require('jsonfile');

jsonfile.spaces = 4;

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

/* GET copy */
router.get('/export', function(req, res, next) {
    res.redirect('/');
    // res.render('export');
});

/* POST copy */
router.post('/export', function(req, res, next) {
    let errors = [];
    let message = null;

    let app_id = req.body.app_id;
    let app_key = req.body.app_key;

    let export_settings = false; if (req.body.export_settings) export_settings = true;
    let export_datas = false; if (req.body.export_datas) export_datas = true;

    let client = null;
    if (app_id && app_key)
        client = algoliasearch(app_id, app_key); // destination
    else errors.push('Please provide an app id and an admin api key.');

    if (client) {
        // check access to storage
        fs.access('./storage', fs.constants.R_OK | fs.constants.W_OK, (err) => {
            if (err) throw err;
            else console.log('can read/write');
        });
        // generate file name
        let file = './storage/'+app_id+'-'+Math.floor(new Date() / 1000)+'.json';


        async.series([
            function(callback) {
                let datas = [];
                // first get source list index
                client.listIndexes((err, content) => {
                    if (!err) {

                        async.forEachOf(content.items, function (value, key, callback3) {
                            let obj = {
                                name: value.name
                            };

                            // mount index
                            let sourceIndex = client.initIndex(value.name);

                            async.series([
                                function(callback2) {
                                    // copy settings
                                    if (export_settings) {
                                        // copy index settings
                                        sourceIndex.getSettings((err, content2) => {
                                            callback2(null, content2);

                                        });
                                    } else {
                                        callback2(null, null);
                                    }
                                },
                                function(callback2) {

                                    // copy datas
                                    if (export_datas) {
                                        // browse all origin index datas
                                        let browser = sourceIndex.browseAll();
                                        let hits = [];

                                        browser.on('result', function onResult(content) {
                                          hits = hits.concat(content.hits);
                                        });

                                        browser.on('end', function onEnd() {
                                          console.log('Finished!');
                                          console.log('We got %d hits', hits.length);

                                          callback2(null, hits);
                                        });

                                        browser.on('error', function onError(err) {
                                          throw err;
                                        });
                                    } else {
                                        callback2(null, null);
                                    }
                                }
                            ], function(err, results) {
                                obj.settings = results[0];
                                obj.datas = results[1];
                                datas.push(obj);
                            });
                            callback3(null);
                        }, function(err) {
                        });
                    }
                });
                callback(null, datas);
            }
        ], function(err, results) {
            let datasEnd = results[0];

            console.log(datasEnd);

            jsonfile.writeFile(file, datasEnd, function(err) {
                if (err) throw err;

            });
        });

    } else {
        errors.push('Sorry, this environment doesn\'t exist.');
    }



    res.render('export', {errors: errors, message: message});
});

module.exports = router;
