/*jshint node:true, laxcomma:true */
'use strict';

var cube = require('cube');
var util = require('util');

function _clean (str) {
    str = str.toLowerCase();

    // convert all periods and spaces into underscore
    // related: https://github.com/square/cube/issues/95
    str = str.replace(/[\.\s]/g, '_');

    // remove all remaining non-alpha, non-numeric, non-underscore chars
    str = str.replace(/[^_a-zA-Z\d:]/g, '');

    return str;
}

function CubeBackend (startupTime, config, emitter){
    var self = this;

    this.lastFlush = startupTime;
    this.lastException = 0;
    this.prefixStats = config.prefixStats || 'statsd';  // TODO: how to dynamically retrieve this from statsd?
    this.prefixStatsLength = this.prefixStats.length;

    this.cubeHost = config.cubeHost || 'localhost';
    this.cubePort = config.cubePort || 1180;

    this.cube = cube.emitter('udp://' + this.cubeHost + ':' + this.cubePort);

    // bind to flush requests from statsd
    emitter.on('flush', function(timestamp, metrics) { self.flush(timestamp, metrics); });

    // bind to status request from statsd management interface
    // TODO: provide useful summary statistics (e.g. bytes sent, error count)
    emitter.on('status', function(callback) { self.status(callback); });
}

CubeBackend.prototype.flush = function (timestamp, metrics) {
    // counters
    for (var counterEvent in metrics.counters) {
        if (counterEvent.substring(0, this.prefixStatsLength) !== this.prefixStats) {
            this.cube.send({
                type: _clean(counterEvent),
                data: {c: metrics.counters[counterEvent]}
            });
        }
    }

    // gauges
    for (var guageEvent in metrics.gauges) {
        if (guageEvent.substring(0, this.prefixStatsLength) !== this.prefixStats) {
            this.cube.send({
                type: _clean(guageEvent),
                data: {g: metrics.gauges[guageEvent]}
            });
        }
    }

    // timers (timer_data ONLY)
    for (var timerEvent in metrics.timer_data) {
        if (timerEvent.substring(0, this.prefixStatsLength) !== this.prefixStats) {
            this.cube.send({
                type: _clean(timerEvent),
                data: {ms: metrics.timer_data[timerEvent]}
            });
        }
    }

    // sets
    var _sets = function (vals) {
        var response = {};

        for (var val in vals) {
            response[val] = vals[val].values();
        }

        return response;
    }(metrics.sets);

    for (var setEvent in _sets) {
        if (setEvent.substring(0, this.prefixStatsLength) !== this.prefixStats) {
            this.cube.send({
                type: _clean(setEvent),
                data: {s: _sets[setEvent]}
            });
        }
    }
};

CubeBackend.prototype.status = function (write) {
    ['lastFlush', 'lastException'].forEach(function (key) {
        write(null, 'console', key, this[key]);
    }, this);
};

exports.__test = {
    _clean: _clean
};

exports.init = function (startupTime, config, emitter) {
    var instance = new CubeBackend(startupTime, config, emitter);

    return true;
};