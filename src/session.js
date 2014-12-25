/** User session API */

"use strict";

var _Q = require('q');
var copy = require('nor-data').copy;
var merge = require('merge');
var is = require('nor-is');
var debug = require('nor-debug');
var HTTPError = require('nor-express').HTTPError;
var ref = require('nor-ref');
var ARRAY = require('nor-array');

/** Initialize the session */
function init_session(req) {
	debug.assert(req.session).is('object');
	if(!is.obj(req.session.client)) {
		req.session.client = {};
	}
	if( (!is.obj(req.session.client.messages)) || is.array(req.session.client.messages) ) {
		req.session.client.messages = {};
	}
}

/* Delete message */
function delete_message(req, uuid) {
	debug.assert(uuid).is('uuid');
	delete req.session.client.messages[uuid];
}

/** Create message */
function create_message(req, data) {
	debug.assert(req).is('object');
	debug.assert(data).is('object');
	var msg = copy(data);
	msg.$id = require('node-uuid').v4();
	req.session.client.messages[msg.$id] = msg;
	return msg;
}

/** Returns nor-express based session resource */
var session_builder = module.exports = function session_builder(opts) {
	opts = copy( opts || {} );
	opts.path = opts.path || 'api/session';

	/** Prepare for public */
	function view_session_message(req, msg) {
		var result = copy(msg);
		result.$ref = ref(req, opts.path + '/messages', msg.$id );
		return result;
	}

	/** Prepare for public */
	function view_session_messages(req) {
		var result = {};
		result.$ = ARRAY(Object.keys(req.session.client.messages)).filter(is.uuid).map(function(uuid) {
			return view_session_message(req, req.session.client.messages[uuid]);
		}).valueOf();
		result.$ref = ref(req, opts.path+'/messages');
		return result;
	}

	/** Prepare for public */
	function view_session(req) {
		var result = copy(req.session.client);
		result.messages = view_session_messages(req);
		result.$ref = ref(req, opts.path);
		return result;
	}

	var routes = {};

	/** Returns current session data */
	routes.GET = function api_session_get(req/*, res*/) {
		return _Q.fcall(function api_session_get_() {
			init_session(req);
			return view_session(req);
		});
	};

	/** Changes current session data */
	routes.POST = function api_session_post(req, res) {
		return _Q.fcall(function api_session_post_() {
			init_session(req);
			debug.assert(req.body).is('object');
			debug.assert(req.session.client).is('object');
			req.session.client = merge(req.session.client, req.body);
			res.redirect(303, ref(req, opts.path) );
		});
	};

	/** Changes current session data */
	routes.PUT = function api_session_put(req, res) {
		return _Q.fcall(function api_session_put_() {
			debug.assert(req.session).is('object');
			debug.assert(req.body).is('object');
			req.session.client = copy(req.body);
			res.redirect(303, ref(req, opts.path) );
		});
	};

	/** Changes current session data */
	routes.DELETE = function api_session_delete(req, res) {
		return _Q.fcall(function api_session_delete_() {
			debug.assert(req.session).is('object');
			req.session.client = {};
			init_session(req);
			res.redirect(303, ref(req, opts.path) );
		});
	};

	/** Messages Interface */

	routes.messages = {};

	/** View messages */
	routes.messages.GET = function session_messages_get(req/*, res*/) {
		return _Q.fcall(function session_messages_get_() {
			init_session(req);
			return view_session_messages(req);
		});
	};

	/** Create new message */
	routes.messages.POST = function session_messages_post_(req, res) {
		return _Q.fcall(function session_messages_post_() {
			init_session(req);
			var msg = create_message(req, req.body);
			res.redirect(303, ref(req, opts.path+'/messages', msg.$id) );
		});
	};

	routes.messages[':uuid'] = {};

	/** View message by uuid */
	routes.messages[':uuid'].GET = function session_messages_uuid_get(req/*, res*/) {
		return _Q.fcall(function session_messages_uuid_get_() {
			debug.assert(req.params.uuid).is('uuid');
			var uuid = req.params.uuid;
			init_session(req);
			if(req.session.client.messages[uuid] === undefined) {
				throw new HTTPError(404);
			}
			return view_session_message(req, req.session.client.messages[uuid] );
		});
	};

	/** Delete message by uuid */
	routes.messages[':uuid'].DELETE = function(req, res) {
		return _Q.fcall(function session_messages_uuid_delete_() {
			debug.assert(req.params.uuid).is('uuid');
			var uuid = req.params.uuid;
			init_session(req);
			if(req.session.client.messages[uuid] === undefined) {
				throw new HTTPError(404);
			}
			delete_message(req, uuid);
			res.redirect(303, ref(req, opts.path+'/messages') );
		});
	};

	// Returns the resource
	return routes;
}; // End of session_builder

// Exports
session_builder.init_session = init_session;
session_builder.delete_message = delete_message;
session_builder.create_message = create_message;

/* EOF */
