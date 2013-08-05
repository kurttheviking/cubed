/*jshint node:true, laxcomma:true */
'use strict';

var cube = require('cube');
var util = require('util');

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
    console.log('[cubed] flushing at ', timestamp);
    console.log(metrics);

    // counters
    for (var counterEvent in metrics.counters) {
        if (counterEvent.substring(0, this.prefixStatsLength) !== this.prefixStats) {
            this.cube.send({
                type: counterEvent,
                data: {c: metrics.counters[counterEvent]}
            });
        }
    }

    // gauges
    for (var guageEvent in metrics.gauges) {
        if (guageEvent.substring(0, this.prefixStatsLength) !== this.prefixStats) {
            this.cube.send({
                type: guageEvent,
                data: {g: metrics.counters[guageEvent]}
            });
        }
    }

    // timers (timer_data ONLY)
    for (var timerEvent in metrics.timer_data) {
        if (timerEvent.substring(0, this.prefixStatsLength) !== this.prefixStats) {
            this.cube.send({
                type: timerEvent,
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
                type: setEvent,
                data: {ms: metrics.timer_data[setEvent]}
            });
        }
    }
};

CubeBackend.prototype.status = function (write) {
    ['lastFlush', 'lastException'].forEach(function (key) {
        write(null, 'console', key, this[key]);
    }, this);
};

exports.init = function (startupTime, config, emitter) {
    var instance = new CubeBackend(startupTime, config, emitter);

    return true;
};