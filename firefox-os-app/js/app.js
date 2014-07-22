$(function() {
  'use strict';

  function log(msg, type) {
    if (/^info/.test(type) || !type) {
      type = 'info';
    }
    else if (/^warn/.test(type)) {
      type = 'warning';
    }
    else if (/^err/.test(type) || /^dang/.test(type)) {
      type = 'danger';
    }

    $('#console').append('<div class="alert alert-' + type + '">' + msg + '</div>');
  }

  // TODO Promise
  var db = new window.PouchDB('settings')
    , pushRegistration
    , homeBase = 'http://ffpush.dev.coolaj86.com'
    , home = homeBase + '/api/push'
    //, home = 'https://u34hasta3bs5.runscope.net'
    ;

  // https://developer.mozilla.org/en-US/docs/WebAPI
  // https://developer.mozilla.org/en-US/docs/Web/API/Simple_Push_API
  // https://developer.mozilla.org/en-US/Apps/Build/App_permissions
  // https://developer.mozilla.org/en-US/Apps/Build/API_support_table

  db.get('reg_url', function (err, doc) {
    pushRegistration = doc || { _id: 'reg_url', url: '' };
  });

  $('#push-form').on('submit', function (ev) {
    //ev.defaultPrevented = true;
    ev.preventDefault();
    ev.stopPropagation();

    pushRegistration.url = $('#reg-url').val();
    db.put(pushRegistration);
    db.get('push_endpoint', function (err, doc) {
      /*
      if (err && 404 !== err.status) {
        console.error(err);
        window.alert('Error with PouchDB / IndexedDB: ' + err.message);
      }
      */

      if (!doc) {
        registerMozilla();
      } else if (!doc.friendlyId) {
        registerHome(doc);
      } else {
        log('Already Registered');
        log(doc.friendlyId);
        log(doc.url);
      }
    });
  });

  $('body').on('click', '#console-clear', function () {
    $('#console').html('');
  });

  function registerHome(endpoint) {
    $.post(home, { endpoint: endpoint }).then(function (data) {
      log('communicated with server');
      log(JSON.stringify(data));

      db.get('push_endpoint', function (err, data) {
        if (!data || !data.url) {
          log.error('db data disappeared', 'error');
          data = { _id: 'push_endpoint' };
        }

        data.url = endpoint;
        data.friendlyId = data.id;

        db.put(data, function (err) {
          if (err) {
            log('error storing in pouch', 'error');
            log(err && err.message || err, 'error');
          }
        });
      }, function (err) {
        log('error communicating with server', 'error');
        log(err && err.message || err, 'error');
      });
    });
  }

  function registerMozilla() {
    if (!window.navigator.push) {
      console.error('missing navigator.push');
    }
 
    console.log('registering');
    var req = navigator.push.register()
      ;
    
    log('Registering for push notification...');
    req.addEventListener('success', function (ev) {
      log(req.result, 'info');

      var endpoint = req.result
        //, request = new XMLHttpRequest({ mozSystem: true, mozAnon: true })
        ;

      console.log("New endpoint: " + endpoint);
      $('#response').text("New endpoint: " + endpoint);
      console.log(ev);
      registerHome(endpoint);

      /*
      request.open(pushRegistration.url, "POST", true);
      request.setHeader('Content-Type', 'application/json');
      request.send(JSON.stringify({ url: endpoint }, null, '  '));
      */

      db.put({
        _id: 'push_endpoint'
      , url: req.result
      });
    });

    req.addEventListener('error', function(ev) {
      console.error("Error getting a new endpoint: " + ev.target.error.name);
      console.error("Error getting a new endpoint: " + req.error);
      console.error("Error getting a new endpoint: " + req.error.name);

      log(ev.target.error.name, 'error');
      log(req.error, 'error');
      log(req.error.name, 'error');
    });
  }

  if (window.navigator.mozSetMessageHandler) {
    window.navigator.mozSetMessageHandler('push', function(ev) {
      log("'push' received " + ev.version + " " + ev.pushEndpoint);
      console.log('My endpoint is ' + ev.pushEndpoint);
      console.log('My new version is ' +  ev.version);
      //Remember that you can handle here if you have more than
      //one pushEndpoint
      // doStuff()
    });
  } else {
    // No message handler
  }

  if (window.navigator.mozSetMessageHandler) {
    window.navigator.mozSetMessageHandler('push-register', function() {
      log("'push-register' received.", 'warn');
      log("The old endpoint is stale and will now be renewed");
      
      db.get('push_endpoint', function(err, doc) {
        if (!doc) {
          registerMozilla();
          return;
        }

        // db.remove(doc, function(err, response) { });
        db.remove(doc._id, doc._rev, function (/*err, response*/) {
          registerMozilla();
        });
      });
    });
  } else {
    // No message handler
  }
});