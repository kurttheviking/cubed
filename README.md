cubed
=====

a super simple backend for [statsd](https://github.com/etsy/statsd); relays flushed events to a [cube](https://github.com/square/cube) instance via udp


## install

from your statsd directory

```
npm install cubed
```

Add the `cubed` backend configuration to your statsd configuration file. 

```javascript
{
    cubeHost: 'localhost',
    cubePort: 1180,
    backends: ['./node_modules/cubed/index.js'],
    deleteIdleStats: true
}
```

***pro tip***: although not required, you probably want to set `deleteIdleStats` to `true` in the cubed configuration block. cube's evaluator automatically populates sparse data with `0` values. thus, there is no need to send null stats to the collector.

defaults:
- `cubeHost`: `localhost`
- `cubePort`: `1180`


## usage

once the cubed backend is installed and statsd is restarted, data will automatically be sent to cube at each statsd flush. the cube event data object is generated based on the type of statsd event received.

for example, the statsd event:

```
keiju:3|c
```

would generate (at flush time) the following cube event:

```javascript
{
  "type": "keiju",
  "time": "2013-07-12T17:10:00Z",
  "data": {
    "c": 3
  }
}
```

cube, in turn, would generate a new document in the `keiju_events` collection:

```javascript
{
  "_id": ObjectId("..."),
  "t": ISODate("2013-07-12T17:10:0Z"),
  "d": {
    "c": 3
  }
}
```

cube's data keys are based on the default type keys in statsd events:
- `c` for counters
- `ms` for timers
- `g` for guages
- `s` for sets

cube automatically manages the `keiju_metrics` colleciton. the following evaluator request would sum the received counts at 1 minute intervals (remember: cube's evaluator uses [fixed resolution times](https://github.com/square/cube/wiki/Evaluator)).

```
http://localhost:1081/1.0/metric?expression=sum(keiju(c))&step=6e4
```

which would respond with:

```javascript
[
    ...
    {
        "time": "2013-07-12T17:10:00Z",
        "value": 3
    },
    ...
]
```

***pro tip***: do not use cube's evaluator at time resolutions smaller than your statsd flush interval (the resulting data will include inaccurate 0 values which do not reflect observed behavior). we have found that it is helpful to include the available time resolutions within internal metrics analysis docs.

**notes**
- statsd internal statistics (e.g. `counters.statsd.packets_received`) are not sent to cube.
- raw timer data is not provided to cube; cube only receives the summary timer statistics (mean, upper count, sum, etc).
- statsd is designed to collect data in (nearly) real time. as a result, there is currently no good way to pass a timestamp for a previously recorded event to cube from statsd. as a result, all events are timestamped by cube's collector when they are received by cube.


## tests

coming soon? use with caution.


## no tcp?

cubed uses udp to communicate with the cube instance. although tcp is supported by cube, it is not supported by statsd. statsd is designed to be "fire and forget". so too is cubed. if you are looking for guaranteed data persistence, consider using cube's tcp interface directly rather than through statsd and cubed.


## why cubed

the future of cube and statsd is uncertain. indeed, that is the fate of all software. however, at present, our team has found the cube evaluator to be one of the more robust options available--after you master the slightly unusual [metric expression syntax](https://github.com/square/cube/wiki/Queries#wiki-metric). in addition, statsd is both fast and robust for bursted statistical analysis. they are both also rediculously easy to integrate into node applications or any udp-enabled service.

graphite (which uses carbon) is an incredibly powerful solution. however, the ui and authorization strategies need some tlc. installing graphite is a bit rough-and-tumble and an adventure in python package dependencies. as an alternative, we are building rubyx (repo link coming soon) -- a stunningly simple node app and modern ui for interacting with cubed stats.
