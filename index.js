var async   = require('async'),
    ts      = require('ts3sq'),
    request = require('request'),
    async   = require('async'),
    nconf   = require('nconf').env().argv(),
    _       = require('lodash');
    
nconf.defaults({
  app: {
  },
  groups: {
    groupType: {
      Alliance: 9,
      Allied: 10
    },
    roles: {
      Admin: 6,
      FC: 11,
      Director: 12
    }
  }
});

//Lets connect for a start...
var client = new ts.ServerQuery('localhost', 10011);
client.on('ready', function() {
	//...login...
	client.execute('login '+nconf.get("username")+' '+nconf.get("password"));
	//...and switch to instance 4, better check if this was successful, so we use a callback this time.
	client.execute('use 1', function(element) {
	    console.log("got server", element);
            //element always has an "err" property, just like the query itself always returns an error, even if the action was successful.
	});
	//The first TS3 library for node to support notifications, the SQ isn't just request-reponse, hooray!
	client.execute('servernotifyregister event=server');
	client.execute('servergrouplist', function(element) {
	    console.log('servergrouplist', element);
	});
	setInterval(function() {
	client.execute('whoami', function(element) {
            console.log('keep-alive');
        }); 
        }, 5000);
        client.execute('clientupdate client_nickname=OSS\\sTS\\sMANAGER');
});
client.on('notify', function(notification) {
        //console.log("notify", notification);
	if (notification.type == "notifycliententerview") {
	        var uid=notification.body[0].client_unique_identifier+"=";
	        var headers = {
                    "Authorization": uid,
                    "X-App-Id": nconf.get("app").id,
                    "X-App-Secret": nconf.get("app").secret
	        };
	        request.get("https://auth.oss.rocks/api/authorize", {headers: headers}, function(err, res, body) {
	            if (res.statusCode == 200) {
	                var data=JSON.parse(body).data;
	                
	                if (notification.body[0].client_nickname!=data.group+" - "+data.username) {
	                  return client.execute('clientpoke clid='+notification.body[0].clid+' msg=To\\sgain\\saccess\\splease\\suse\\syour\\sproper\\susername:\\s'+data.group+'\\s-\\s'+data.username.replace(/ /g, "\\\\s"));
	                }
	                /*client.execute('clientedit clid='+notification.body[0].clid+' client_nickname='+data.group+'\\s-\\s'+data.username, function(element) {
	                  console.log("clientedit", element);
	                });*/
	                _.each(nconf.get("groups"), function(groups, key) {
                            _.each(groups, function(v,k) {
                              if (_.isString(data[key]) && data[key]==k) {
                                client.execute('servergroupaddclient sgid='+v+' cldbid='+notification.body[0].client_database_id);
                              } else {
                                if (data[key].indexOf(k)!=-1) {
                                  client.execute('servergroupaddclient sgid='+v+' cldbid='+notification.body[0].client_database_id);
                                }
                              }
                            });
	                });
	            } else {
	                client.execute('sendtextmessage targetmode=3 target='+notification.body[0].clid+' msg=Please\\sadd\\syour\\sTS3\\sID\\sat\\shttps://auth.bos.gs/external\\sto\\sget\\sauthorized.');
	            }
                });
		console.log(notification.body[0].client_nickname + " has connected");
	}
});

client.on('error', function(error){
	// This is usually an error right from the TCP socket, the close event will most likely follow on the next tick
});

client.on('close', function(){
	// Connection closed, for whatever reason.
});